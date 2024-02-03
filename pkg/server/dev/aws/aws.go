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

	opts := MQTT.NewClientOptions().AddBroker(presignedURL).SetClientID(
		hex.EncodeToString(func(b []byte) []byte { _, _ = rand.Read(b); return b }(make([]byte, 16))),
	).SetTLSConfig(&tls.Config{
		InsecureSkipVerify: true,
	})

	mqttClient := MQTT.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	var pending sync.Map

	prefix := fmt.Sprintf("ion/%s/%s", p.App().Name, p.App().Stage)
	if token := mqttClient.Subscribe(prefix+"/+/response", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("received message", "topic", m.Topic())
		clientID := strings.Split(m.Topic(), "/")[3]
		payload := m.Payload()
		go func() {
			write, ok := pending.Load(clientID)
			if !ok {
				mqttClient.Publish(prefix+"/"+clientID+"/reboot", 1, false, []byte("reboot"))
				return
			}
			casted := write.(*io.PipeWriter)
			casted.Write(payload)
			casted.Close()
		}()
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	var lastComplete *project.CompleteEvent

	bus.Subscribe(ctx, func(event *project.StackEvent) {
		if event.CompleteEvent != nil {
			lastComplete = event.CompleteEvent
		}
	})

	if token := mqttClient.Subscribe(prefix+"/+/init", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("received message", "topic", m.Topic())
		bytes := m.Payload()
		workerID := strings.Split(m.Topic(), "/")[3]
		go func() {
			if lastComplete == nil {
				return
			}
			var payload struct {
				FunctionID string `json:"functionID"`
			}
			err := json.Unmarshal(bytes, &payload)
			if err != nil {
				return
			}
			slog.Info("got init", "functionID", payload.FunctionID)
			warp, ok := lastComplete.Warps[payload.FunctionID]
			if !ok {
				return
			}
			runtime.Build(ctx, &runtime.BuildInput{
				WarpDefinition: warp,
				Project:        p,
				Dev:            true,
			})
			runtime.Run(ctx, &runtime.RunInput{
				WarpDefinition: warp,
				Project:        p,
				WorkerID:       workerID,
				Dev:            true,
			})
			// cmd := exec.Command("node", ".sst/platform/dist/nodejs-runtime/index.js", "src/index.handler")
			// cmd.Stdout = os.Stdout
			// cmd.Stderr = os.Stderr
			// cmd.Env = append(os.Environ(), "AWS_LAMBDA_RUNTIME_API=localhost:44149/lambda/"+clientID)
			// cmd.Run()
			/*
				for {
					resp, err := http.Get("http://localhost:44149/lambda/" + clientID + "/runtime/invocation/next")
					if err != nil {
						continue
					}
					requestID := resp.Header.Get("Lambda-Runtime-Aws-Request-Id")
					defer resp.Body.Close()

					_, err = http.Post("http://localhost:44149/lambda/"+clientID+"/runtime/invocation/"+requestID+"/response", "text/plain", bytes.NewBufferString(`{"statusCode": 200, "body": "ok"}`))
					if err != nil {
						continue
					}
					slog.Info("posted response", "requestID", requestID)
				}
			*/
		}()
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	slog.Info("connected to iot")

	mux.HandleFunc(`/lambda/`, func(w http.ResponseWriter, r *http.Request) {
		path := strings.Split(r.URL.Path, "/")
		slog.Info("lambda request", "path", path)
		clientID := path[2]
		writer := iot_writer.New(mqttClient, prefix+"/"+clientID+"/request")
		read, write := io.Pipe()
		pending.Store(clientID, write)

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
			r.Body.Close()
		}
		writer.Flush()

		hijacker, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "webserver doesn't support hijacking", http.StatusInternalServerError)
			return
		}

		conn, _, err := hijacker.Hijack()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer conn.Close()

		slog.Info("waiting for response", "clientID", clientID)
		_, err = io.Copy(conn, read)
		if err != nil {
			fmt.Println("Error writing to the connection:", err)
		}
		slog.Info("done with response", "clientID", clientID)
	})

	return func() error {
		slog.Info("cleaning up iot")
		mqttClient.Disconnect(250)
		return nil
	}, nil
}
