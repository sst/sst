package aws

import (
	"bufio"
	"bytes"
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
	"github.com/sst/ion/cmd/sst/mosaic/aws/iot_writer"
	"github.com/sst/ion/cmd/sst/mosaic/bus"
	"github.com/sst/ion/cmd/sst/mosaic/watcher"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/runtime"
	"github.com/sst/ion/pkg/server"
)

type fragment struct {
	ID    string `json:"id"`
	Index int    `json:"index"`
	Count int    `json:"count"`
	Data  string `json:"data"`
}

type FunctionInvokedEvent struct {
	FunctionID string
	WorkerID   string
	RequestID  string
	Input      []byte
}

type FunctionResponseEvent struct {
	FunctionID string
	WorkerID   string
	RequestID  string
	Output     []byte
}

type FunctionErrorEvent struct {
	FunctionID   string
	WorkerID     string
	RequestID    string
	ErrorType    string   `json:"errorType"`
	ErrorMessage string   `json:"errorMessage"`
	Trace        []string `json:"trace"`
}

type FunctionBuildEvent struct {
	FunctionID string
	Errors     []string
}

type FunctionLogEvent struct {
	FunctionID string
	WorkerID   string
	RequestID  string
	Line       string
}

var ErrIoTDelay = fmt.Errorf("iot not available")

func Start(
	ctx context.Context,
	p *project.Project,
	s *server.Server,
	args map[string]interface{},
) error {
	expire := time.Hour * 24
	from := time.Now()
	server := fmt.Sprintf("localhost:%d/lambda/", s.Port)

	prov, _ := p.Provider("aws")
	config := prov.(*provider.AwsProvider).Config()
	slog.Info("getting endpoint")
	iotClient := iot.NewFromConfig(config)
	endpointResp, err := iotClient.DescribeEndpoint(ctx, &iot.DescribeEndpointInput{})
	if err != nil {
		return err
	}

	originalURL, err := url.Parse(fmt.Sprintf("wss://%s/mqtt?X-Amz-Expires=%s", *endpointResp.EndpointAddress, strconv.FormatInt(int64(expire/time.Second), 10)))
	if err != nil {
		return err
	}
	slog.Info("found endpoint endpoint", "url", originalURL.String())

	creds, err := config.Credentials.Retrieve(ctx)
	if err != nil {
		return err
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
		return err
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
		SetMaxReconnectInterval(time.Second * 1).
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
		return fmt.Errorf("failed to connect to mqtt: %w", token.Error())
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
		return token.Error()
	}

	type WorkerInfo struct {
		FunctionID       string
		WorkerID         string
		Worker           runtime.Worker
		CurrentRequestID string
		Env              []string
	}

	initChan := make(chan MQTT.Message, 1000)
	shutdownChan := make(chan MQTT.Message, 1000)

	type workerResponse struct {
		response    *http.Response
		requestBody *bytes.Buffer
		workerID    string
		path        []string
	}
	workerResponseChan := make(chan workerResponse, 1000)
	workerShutdownChan := make(chan *WorkerInfo, 1000)

	evts := bus.Subscribe(&watcher.FileChangedEvent{}, &project.CompleteEvent{})

	if token := mqttClient.Subscribe(prefix+"/+/init", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("iot", "topic", m.Topic())
		initChan <- m
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	if token := mqttClient.Subscribe(prefix+"/+/shutdown", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("iot", "topic", m.Topic())
		shutdownChan <- m
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	slog.Info("connected to iot")

	go func() {
		var complete *project.CompleteEvent
		workers := map[string]*WorkerInfo{}
		workerEnv := map[string][]string{}
		builds := map[string]*runtime.BuildOutput{}

		getBuildOutput := func(functionID string) *runtime.BuildOutput {
			build := builds[functionID]
			if build != nil {
				return build
			}
			warp := complete.Warps[functionID]
			build, err = runtime.Build(ctx, &runtime.BuildInput{
				Warp:    warp,
				Project: p,
				Dev:     true,
			})
			if err == nil {
				bus.Publish(&FunctionBuildEvent{
					FunctionID: functionID,
					Errors:     build.Errors,
				})
			} else {
				bus.Publish(&FunctionBuildEvent{
					FunctionID: functionID,
					Errors:     []string{err.Error()},
				})
			}
			if err != nil || len(build.Errors) > 0 {
				delete(builds, functionID)
				return nil
			}
			builds[functionID] = build
			return build
		}

		run := func(functionID string, workerID string) bool {
			build := getBuildOutput(functionID)
			if build == nil {
				return false
			}
			warp := complete.Warps[functionID]
			worker, _ := runtime.Run(ctx, &runtime.RunInput{
				Warp:       warp,
				Links:      complete.Links,
				Server:     server + workerID,
				Project:    p,
				WorkerID:   workerID,
				Runtime:    warp.Runtime,
				FunctionID: functionID,
				Build:      build,
				Env:        workerEnv[workerID],
			})
			info := &WorkerInfo{
				FunctionID: functionID,
				Worker:     worker,
				WorkerID:   workerID,
			}
			go func() {
				logs := worker.Logs()
				scanner := bufio.NewScanner(logs)
				for scanner.Scan() {
					line := scanner.Text()
					bus.Publish(&FunctionLogEvent{
						FunctionID: functionID,
						WorkerID:   workerID,
						RequestID:  info.CurrentRequestID,
						Line:       line,
					})
				}
				workerShutdownChan <- info
			}()
			workers[workerID] = info

			return true
		}

		for unknown := range evts {
			casted, ok := unknown.(*project.CompleteEvent)
			if !ok {
				continue
			}
			complete = casted
			break
		}
		for {
			select {
			case <-ctx.Done():
				return
			case evt := <-workerResponseChan:
				info, ok := workers[evt.workerID]
				if !ok {
					continue
				}

				responseBody, err := io.ReadAll(evt.response.Body)
				if err != nil {
					continue
				}
				if evt.path[len(evt.path)-1] == "next" {
					info.CurrentRequestID = evt.response.Header.Get("lambda-runtime-aws-request-id")
					bus.Publish(&FunctionInvokedEvent{
						FunctionID: info.FunctionID,
						WorkerID:   info.WorkerID,
						RequestID:  info.CurrentRequestID,
						Input:      responseBody,
					})
				}
				if evt.path[len(evt.path)-1] == "response" {
					bus.Publish(&FunctionResponseEvent{
						FunctionID: info.FunctionID,
						WorkerID:   info.WorkerID,
						RequestID:  evt.path[len(evt.path)-2],
						Output:     responseBody,
					})
				}
				if evt.path[len(evt.path)-1] == "error" {
					fee := &FunctionErrorEvent{
						FunctionID: info.FunctionID,
						WorkerID:   info.WorkerID,
						RequestID:  evt.path[len(evt.path)-2],
					}
					json.Unmarshal(evt.requestBody.Bytes(), &fee)
					bus.Publish(fee)
				}
			case info := <-workerShutdownChan:
				slog.Info("worker died", "workerID", info.WorkerID)
				existing, ok := workers[info.WorkerID]
				if !ok {
					continue
				}
				// only delete if a new worker hasn't already been started
				if existing == info {
					delete(workers, info.WorkerID)
				}
				break
			case unknown := <-evts:
				switch evt := unknown.(type) {
				case *project.CompleteEvent:
					complete = evt
					break
				case *watcher.FileChangedEvent:
					slog.Info("checking if code needs to be rebuilt", "file", evt.Path)
					toBuild := map[string]bool{}

					for functionID := range builds {
						warp, ok := complete.Warps[functionID]
						if !ok {
							continue
						}
						if runtime.ShouldRebuild(warp.Runtime, warp.FunctionID, evt.Path) {
							for _, worker := range workers {
								if worker.FunctionID == functionID {
									slog.Info("stopping", "workerID", worker.WorkerID, "functionID", worker.FunctionID)
									worker.Worker.Stop()
								}
							}
							delete(builds, functionID)
							toBuild[functionID] = true
						}
					}

					for functionID := range toBuild {
						output := getBuildOutput(functionID)
						if output == nil {
							delete(toBuild, functionID)
						}
					}

					for workerID, info := range workers {
						if toBuild[info.FunctionID] {
							run(info.FunctionID, workerID)
						}
					}
					break
				}
			case m := <-initChan:
				slog.Info("got init")
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
				if ok := run(payload.FunctionID, workerID); !ok {
					result, _ := http.Post("http://"+server+workerID+"/runtime/init/error", "application/json", strings.NewReader(`{"errorMessage":"Function failed to build"}`))
					defer result.Body.Close()
					body, _ := io.ReadAll(result.Body)
					slog.Info("error", "body", string(body), "status", result.StatusCode)

					if result.StatusCode != 202 {
						result, _ := http.Get("http://" + server + workerID + "/runtime/invocation/next")
						requestID := result.Header.Get("lambda-runtime-aws-request-id")
						result, _ = http.Post("http://"+server+workerID+"/runtime/invocation/"+requestID+"/error", "application/json", strings.NewReader(`{"errorMessage":"Function failed to build"}`))
						defer result.Body.Close()
						body, _ := io.ReadAll(result.Body)
						slog.Info("error", "body", string(body), "status", result.StatusCode)
					}
				}
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
			}
		}
	}()

	s.Mux.HandleFunc(`/lambda/`, func(w http.ResponseWriter, r *http.Request) {
		path := strings.Split(r.URL.Path, "/")
		slog.Info("lambda request", "path", path)
		workerID := path[2]
		slog.Info("lambda lock", "workerID", workerID)
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

		requestBody := &bytes.Buffer{}
		if r.ContentLength > 0 {
			write := io.MultiWriter(writer, requestBody)
			io.Copy(write, r.Body)
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
			buf := &bytes.Buffer{}
			write := io.MultiWriter(conn, buf)
			_, err = io.Copy(write, read)
			if err != nil {
				slog.Error("error writing to the connection", "error", err)
			}
			resp, err := http.ReadResponse(bufio.NewReader(buf), nil)
			if err == nil {
				workerResponseChan <- workerResponse{
					workerID:    workerID,
					response:    resp,
					requestBody: requestBody,
					path:        path,
				}
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

	<-ctx.Done()
	mqttClient.Disconnect(250)
	return nil
}
