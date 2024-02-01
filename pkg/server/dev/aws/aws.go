package aws

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/iot"
	MQTT "github.com/eclipse/paho.mqtt.golang"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project/provider"
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

	clientID := hex.EncodeToString(func(b []byte) []byte { _, _ = rand.Read(b); return b }(make([]byte, 16)))
	slog.Info("connecting to iot", "clientID", clientID)
	opts := MQTT.NewClientOptions().AddBroker(presignedURL).SetClientID(
		clientID,
	).SetTLSConfig(&tls.Config{
		InsecureSkipVerify: true,
	})

	mqttClient := MQTT.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	var pending sync.Map

	if token := mqttClient.Subscribe("/ion/response", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("received message", "topic", m.Topic())
		payload := m.Payload()
		go func() {
			write, ok := pending.Load("ok")
			if !ok {
				return
			}
			casted := write.(*io.PipeWriter)
			casted.Write(payload)
			casted.Close()
		}()
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	if token := mqttClient.Subscribe("/ion/init", 1, func(c MQTT.Client, m MQTT.Message) {
		go func() {
			slog.Info("received message", "topic", m.Topic())
			resp, err := http.Get("http://localhost:44149/runtime/invocation/next")
			if err != nil {
				return
			}
			slog.Info("got response", "status", resp.Status)
			defer resp.Body.Close()
		}()
	}); token.Wait() && token.Error() != nil {
		return nil, token.Error()
	}

	slog.Info("connected to iot")

	writer := NewIoTWriter(mqttClient, "/ion/request")

	mux.HandleFunc(`/runtime`, func(w http.ResponseWriter, r *http.Request) {
		slog.Info("runtime", "path", r.URL.Path)
		read, write := io.Pipe()
		pending.Store("ok", write)

		writer.Write([]byte(r.Method + " /2018-06-01" + r.URL.Path + " HTTP/1.1\r\n"))
		for name, headers := range r.Header {
			for _, h := range headers {
				fmt.Fprintf(writer, "%v: %v\r\n", name, h)
			}
		}
		fmt.Fprint(writer, "Connection: close\r\n")
		fmt.Fprint(writer, "Host: 127.0.0.1\r\n")
		_, err := fmt.Fprint(writer, "\r\n")

		// if req.Body != nil {
		// 	io.Copy(writer, req.Body)
		// 	req.Body.Close()
		// }
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

		_, err = io.Copy(conn, read)
		if err != nil {
			fmt.Println("Error writing to the connection:", err)
		}
	})

	return func() error {
		slog.Info("cleaning up iot")
		mqttClient.Disconnect(250)
		return nil
	}, nil
}
