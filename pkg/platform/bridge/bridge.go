package main

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
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
	"github.com/sst/ion/pkg/server/dev/aws/iot_writer"
)

var version = "0.0.1"
var LAMBDA_RUNTIME_API = os.Getenv("AWS_LAMBDA_RUNTIME_API")
var SST_APP = os.Getenv("SST_APP")
var SST_STAGE = os.Getenv("SST_STAGE")
var SST_FUNCTION_ID = os.Getenv("SST_FUNCTION_ID")

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

	prefix := fmt.Sprintf("ion/%s/%s/%s", SST_APP, SST_STAGE, clientID)
	slog.Info("prefix", "prefix", prefix)

	initPayload, err := json.Marshal(map[string]interface{}{"functionID": SST_FUNCTION_ID})
	if err != nil {
		return err
	}

	if token := mqttClient.Publish(prefix+"/init", 1, false, initPayload); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	writer := iot_writer.New(mqttClient, prefix+"/response")

	slog.Info("get lambda runtime api", "url", LAMBDA_RUNTIME_API)
	var conn net.Conn

	if token := mqttClient.Subscribe(prefix+"/request", 1, func(c MQTT.Client, m MQTT.Message) {
		payload := m.Payload()
		topic := m.Topic()
		slog.Info("received message", "topic", topic, "payload", string(payload))
		go func() {
			if conn == nil {
				return
			}
			conn.Write(payload)
			slog.Info("wrote request")
		}()
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	if token := mqttClient.Subscribe(prefix+"/reboot", 1, func(c MQTT.Client, m MQTT.Message) {
		go func() {
			if token := mqttClient.Publish(prefix+"/init", 1, false, initPayload); token.Wait() && token.Error() != nil {
				return
			}
		}()
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	for {
		conn, err = net.Dial("tcp", LAMBDA_RUNTIME_API)
		if err != nil {
			break
		}
		slog.Info("waiting for response")
		io.Copy(writer, conn)
		writer.Flush()
	}

	slog.Info("exiting")
	return nil
}
