package main

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/iot"
	MQTT "github.com/eclipse/paho.mqtt.golang"
	"github.com/sst/ion/pkg/server/dev/aws"
)

var version = "0.0.1"

func main() {
	err := run()
	if err != nil {
		panic(err)
	}
}

func run() error {
	ctx := context.Background()
	expire := time.Hour * 24
	from := time.Now()

	config, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return err
	}
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

	clientID := hex.EncodeToString(func(b []byte) []byte { _, _ = rand.Read(b); return b }(make([]byte, 16)))
	slog.Info("connecting to iot", "clientID", clientID)
	opts := MQTT.NewClientOptions().AddBroker(presignedURL).SetClientID(clientID).SetTLSConfig(&tls.Config{
		InsecureSkipVerify: true,
	})

	mqttClient := MQTT.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	if token := mqttClient.Publish("/ion/init", 1, false, "init"); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	writer := aws.NewIoTWriter(mqttClient, "/ion/response")

	lambdaRuntimeAPI := os.Getenv("AWS_LAMBDA_RUNTIME_API")
	slog.Info("get lambda runtime api", "url", lambdaRuntimeAPI)
	var conn net.Conn

	if token := mqttClient.Subscribe("/ion/request", 1, func(c MQTT.Client, m MQTT.Message) {
		payload := m.Payload()
		topic := m.Topic()
		slog.Info("received message", "topic", topic, "payload", string(payload))
		go func() {
			if conn == nil {
				return
			}
			conn.Write(payload)
			slog.Info("written")
		}()
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	for {
		conn, err = net.Dial("tcp", lambdaRuntimeAPI)
		if err != nil {
			break
		}
		slog.Info("proxy ready")
		io.Copy(writer, conn)
		writer.Flush()
	}

	slog.Info("exiting")
	return nil
}
