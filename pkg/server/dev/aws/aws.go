package aws

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/iot"
	MQTT "github.com/eclipse/paho.mqtt.golang"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/runtime"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/aws/iot_writer"
	"github.com/sst/ion/pkg/server/dev/watcher"
)

type fragment struct {
	ID    string `json:"id"`
	Index int    `json:"index"`
	Count int    `json:"count"`
	Data  string `json:"data"`
}

func Start(
	ctx context.Context,
	mux *http.ServeMux,
	aws *provider.AwsProvider,
	p *project.Project,
) (util.CleanupFunc, error) {
	expire := time.Hour * 24
	from := time.Now()

	config := aws.Config()
	slog.Info("getting endpoint")
	iotClient := iot.NewFromConfig(config)
	endpointResp, err := iotClient.DescribeEndpoint(ctx, &iot.DescribeEndpointInput{})
	if err != nil {
		return nil, err
	}

	originalURL, err := url.Parse(fmt.Sprintf("wss://%s/mqtt?X-Amz-Expires=%s", *endpointResp.EndpointAddress, strconv.FormatInt(int64(expire/time.Second), 10)))
	if err != nil {
		return nil, err
	}
	slog.Info("found endpoint endpoint", "url", originalURL.String())

	creds, err := config.Credentials.Retrieve(ctx)
	if err != nil {
		return nil, err
	}
	sessionToken := creds.SessionToken
	creds.SessionToken = ""

	signer := v4.NewSigner()
	req := &http.Request{
		Method: "GET",
		URL:    originalURL,
	}

	presignedURL, _, err := signer.PresignHTTP(ctx, creds, req, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "iotdevicegateway", config.Region, from)
	if err != nil {
		return nil, err
	}
	slog.Info("signed request", "url", presignedURL)
	if sessionToken != "" {
		presignedURL += "&X-Amz-Security-Token=" + url.QueryEscape(sessionToken)
	}

	opts := MQTT.
		NewClientOptions().
		AddBroker(presignedURL).
		SetClientID(
			hex.EncodeToString(func(b []byte) []byte { _, _ = rand.Read(b); return b }(make([]byte, 16))),
		).
		SetTLSConfig(&tls.Config{
			InsecureSkipVerify: true,
		}).
		SetWebsocketOptions(&MQTT.WebsocketOptions{
			ReadBufferSize:  1024 * 1000,
			WriteBufferSize: 1024 * 1000,
		}).
		SetCleanSession(false).
		SetAutoReconnect(true).
		SetConnectionLostHandler(func(c MQTT.Client, err error) {
			slog.Info("mqtt connection lost", "error", err)
		}).
		SetReconnectingHandler(func(c MQTT.Client, co *MQTT.ClientOptions) {
			slog.Info("mqtt reconnecting")
		}).
		SetOnConnectHandler(func(c MQTT.Client) {
			slog.Info("mqtt connected")
		}).
		SetKeepAlive(time.Second * 1200).
		SetPingTimeout(time.Second * 60)

	mqttClient := MQTT.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	var pending sync.Map

	prefix := fmt.Sprintf("ion/%s/%s", p.App().Name, p.App().Stage)
	if token := mqttClient.Subscribe(prefix+"/+/response", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("iot", "topic", m.Topic())
		workerID := strings.Split(m.Topic(), "/")[3]
		payload := m.Payload()
		go func() {
			write, ok := pending.Load(workerID)
			if !ok {
				slog.Info("asking for reboot", "workerID", workerID)
				mqttClient.Publish(prefix+"/"+workerID+"/reboot", 1, false, []byte("reboot"))
				return
			}
			casted := write.(*io.PipeWriter)
			casted.Write(payload)
			casted.Close()
		}()
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	type WorkerInfo struct {
		FunctionID string
		Worker     runtime.Worker
		Env        []string
	}

	completeChan := make(chan *project.CompleteEvent, 1000)
	initChan := make(chan MQTT.Message, 1000)
	shutdownChan := make(chan MQTT.Message, 1000)
	fileChan := make(chan *watcher.FileChangedEvent, 1000)

	bus.Subscribe(ctx, func(event *project.StackEvent) {
		if event.CompleteEvent != nil {
			completeChan <- event.CompleteEvent
		}
	})

	bus.Subscribe(ctx, func(event *watcher.FileChangedEvent) {
		fileChan <- event
	})

	if token := mqttClient.Subscribe(prefix+"/+/init", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("iot", "topic", m.Topic())
		initChan <- m
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	if token := mqttClient.Subscribe(prefix+"/+/shutdown", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("iot", "topic", m.Topic())
		shutdownChan <- m
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	slog.Info("connected to iot")

	go func() {
		complete := <-completeChan
		workers := map[string]*WorkerInfo{}
		workerEnv := map[string][]string{}
		builds := map[string]*runtime.BuildOutput{}

		run := func(functionID string, workerID string) {
			build := builds[functionID]
			warp := complete.Warps[functionID]
			if build == nil {
				build, _ = runtime.Build(ctx, &runtime.BuildInput{
					WarpDefinition: warp,
					Project:        p,
					Dev:            true,
				})
				builds[functionID] = build
			}
			worker, _ := runtime.Run(ctx, &runtime.RunInput{
				WorkerID:   workerID,
				Runtime:    warp.Runtime,
				FunctionID: functionID,
				Build:      build,
				Env:        workerEnv[workerID],
			})
			workers[workerID] = &WorkerInfo{
				FunctionID: functionID,
				Worker:     worker,
			}
		}

		for {
			select {
			case <-ctx.Done():
				return
			case complete = <-completeChan:
				break
			case m := <-initChan:
				bytes := m.Payload()
				workerID := strings.Split(m.Topic(), "/")[3]
				existingWorker, exists := workers[workerID]
				if exists {
					existingWorker.Worker.Stop()
				}
				var payload struct {
					FunctionID string   `json:"functionID"`
					Env        []string `json:"env"`
				}
				err := json.Unmarshal(bytes, &payload)
				if err != nil {
					continue
				}
				workerEnv[workerID] = payload.Env
				run(payload.FunctionID, workerID)
				break

			case m := <-shutdownChan:
				workerID := strings.Split(m.Topic(), "/")[3]
				info, ok := workers[workerID]
				if !ok {
					continue
				}
				info.Worker.Stop()
				delete(workers, workerID)
				delete(workerEnv, workerID)
			case event := <-fileChan:
				functions := map[string]bool{}
				for workerID, info := range workers {
					warp, ok := complete.Warps[info.FunctionID]
					if !ok {
						continue
					}
					if runtime.ShouldRebuild(warp.Runtime, warp.FunctionID, event.Path) {
						slog.Info("rebuilding", "workerID", workerID, "functionID", info.FunctionID)
						info.Worker.Stop()
						delete(builds, info.FunctionID)
						functions[info.FunctionID] = true
					}
				}

				for workerID, info := range workers {
					if functions[info.FunctionID] {
						slog.Info("restarting", "workerID", workerID, "functionID", info.FunctionID)
						run(info.FunctionID, workerID)
					}
				}
			}
		}

	}()

	clientLock := util.NewKeyLock()

	mux.HandleFunc(`/lambda/`, func(w http.ResponseWriter, r *http.Request) {
		path := strings.Split(r.URL.Path, "/")
		slog.Info("lambda request", "path", path)
		workerID := path[2]
		clientLock.Lock(workerID)
		slog.Info("lambda lock", "workerID", workerID)
		defer clientLock.Unlock(workerID)
		writer := iot_writer.New(mqttClient, prefix+"/"+workerID+"/request")
		read, write := io.Pipe()
		pending.Store(workerID, write)
		defer pending.Delete(workerID)

		writer.Write([]byte(r.Method + " /2018-06-01/" + strings.Join(path[3:], "/") + " HTTP/1.1\r\n"))
		for name, headers := range r.Header {
			if name == "Connection" {
				continue
			}
			for _, h := range headers {
				fmt.Fprintf(writer, "%v: %v\r\n", name, h)
			}
		}
		fmt.Fprint(writer, "Connection: close\r\n")
		fmt.Fprint(writer, "Host: 127.0.0.1\r\n")
		_, err := fmt.Fprint(writer, "\r\n")

		if r.ContentLength > 0 {
			io.Copy(writer, r.Body)
		}
		writer.Flush()

		hijacker, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "webserver doesn't support hijacking", http.StatusInternalServerError)
			return
		}

		conn, bufrw, err := hijacker.Hijack()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer conn.Close()

		slog.Info("lambda waiting for response", "workerID", workerID)

		done := make(chan struct{})
		go func() {
			_, err = io.Copy(conn, read)
			if err != nil {
				fmt.Println("Error writing to the connection:", err)
			}
			done <- struct{}{}
		}()

		go func() {
			_, err := bufrw.Read(make([]byte, 1024))
			if err != nil {
				done <- struct{}{}
				slog.Info("lambda disconnected", "workerID", workerID)
			}
		}()

		<-done
		slog.Info("lambda sent response", "workerID", workerID)
	})

	return func() error {
		slog.Info("cleaning up iot")
		mqttClient.Disconnect(250)
		return nil
	}, nil
}
