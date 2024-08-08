package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/iot"
	MQTT "github.com/eclipse/paho.mqtt.golang"
	"github.com/sst/ion/cmd/sst/mosaic/aws/iot_writer"
)

var version = "0.0.1"
var LAMBDA_RUNTIME_API = os.Getenv("AWS_LAMBDA_RUNTIME_API")
var SST_APP = os.Getenv("SST_APP")
var SST_STAGE = os.Getenv("SST_STAGE")
var SST_FUNCTION_ID = os.Getenv("SST_FUNCTION_ID")

var ENV_BLACKLIST = map[string]bool{
	"SST_DEBUG_ENDPOINT":              true,
	"SST_DEBUG_SRC_HANDLER":           true,
	"SST_DEBUG_SRC_PATH":              true,
	"AWS_LAMBDA_FUNCTION_MEMORY_SIZE": true,
	"AWS_LAMBDA_LOG_GROUP_NAME":       true,
	"AWS_LAMBDA_LOG_STREAM_NAME":      true,
	"LD_LIBRARY_PATH":                 true,
	"LAMBDA_TASK_ROOT":                true,
	"AWS_LAMBDA_RUNTIME_API":          true,
	"AWS_EXECUTION_ENV":               true,
	"AWS_XRAY_DAEMON_ADDRESS":         true,
	"AWS_LAMBDA_INITIALIZATION_TYPE":  true,
	"PATH":                            true,
	"PWD":                             true,
	"LAMBDA_RUNTIME_DIR":              true,
	"LANG":                            true,
	"NODE_PATH":                       true,
	"TZ":                              true,
	"SHLVL":                           true,
	"AWS_XRAY_DAEMON_PORT":            true,
	"AWS_XRAY_CONTEXT_MISSING":        true,
	"_HANDLER":                        true,
	"_LAMBDA_CONSOLE_SOCKET":          true,
	"_LAMBDA_CONTROL_SOCKET":          true,
	"_LAMBDA_LOG_FD":                  true,
	"_LAMBDA_RUNTIME_LOAD_TIME":       true,
	"_LAMBDA_SB_ID":                   true,
	"_LAMBDA_SERVER_PORT":             true,
	"_LAMBDA_SHARED_MEM_FD":           true,
}

func main() {
	err := run()
	if err != nil {
		panic(err)
	}
}

func run() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

	logStreamName := os.Getenv("AWS_LAMBDA_LOG_STREAM_NAME")
	workerID := logStreamName[len(logStreamName)-32:]

	slog.Info("connecting to iot", "clientID", workerID)
	opts := MQTT.
		NewClientOptions().
		AddBroker(presignedURL).
		SetClientID(
			workerID,
		).
		SetTLSConfig(&tls.Config{
			InsecureSkipVerify: true,
		}).
		SetWebsocketOptions(&MQTT.WebsocketOptions{
			ReadBufferSize:  1024 * 1000,
			WriteBufferSize: 1024 * 1000,
		}).
		SetCleanSession(false).
		SetAutoReconnect(false).
		SetConnectionLostHandler(func(c MQTT.Client, err error) {
			slog.Info("mqtt connection lost")
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
		return token.Error()
	}

	prefix := fmt.Sprintf("ion/%s/%s/%s", SST_APP, SST_STAGE, workerID)
	slog.Info("prefix", "prefix", prefix)
	slog.Info("get lambda runtime api", "url", LAMBDA_RUNTIME_API)

	requestChan := make(chan iot_writer.ReadMsg, 1000)
	reader := iot_writer.NewReader()
	if token := mqttClient.Subscribe(prefix+"/request/#", 1, func(c MQTT.Client, m MQTT.Message) {
		for _, msg := range reader.Read(m) {
			requestChan <- msg
		}
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	env := []string{}
	for _, e := range os.Environ() {
		key := strings.Split(e, "=")[0]
		if _, ok := ENV_BLACKLIST[key]; ok {
			continue
		}
		env = append(env, e)
	}
	initPayload, err := json.Marshal(map[string]interface{}{"functionID": SST_FUNCTION_ID, "env": env})
	if err != nil {
		return err
	}
	if token := mqttClient.Publish(prefix+"/init", 1, false, initPayload); token.Wait() && token.Error() != nil {
		return token.Error()
	}
	if token := mqttClient.Subscribe(prefix+"/reboot", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("received reboot message")
		go func() {
			if token := mqttClient.Publish(prefix+"/init", 1, false, initPayload); token.Wait() && token.Error() != nil {
				return
			}
		}()
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	if token := mqttClient.Subscribe(prefix+"/kill", 1, func(c MQTT.Client, m MQTT.Message) {
		slog.Info("received kill message")
		cancel()
	}); token.Wait() && token.Error() != nil {
		return token.Error()
	}

	sigs := make(chan os.Signal)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM, syscall.SIGKILL)

	go func() {
		<-sigs
		cancel()
	}()

	defer func() {
		mqttClient.Publish(prefix+"/shutdown", 1, false, initPayload).Wait()
	}()

	for {
		slog.Info("dialing lambda runtime api")
		conn, err := net.Dial("tcp", LAMBDA_RUNTIME_API)
		if err != nil {
			return err
		}
		requestID, err := forwardRequest(ctx, requestChan, conn)
		if err != nil {
			return err
		}
		writer := iot_writer.New(mqttClient, prefix+"/response/"+requestID)
		err = forwardResponse(ctx, writer, conn)
		if err != nil {
			return err
		}
	}
}

type msg struct {
	time      time.Time
	data      []byte
	requestID string
}

func forwardRequest(ctx context.Context, requestChan chan iot_writer.ReadMsg, conn net.Conn) (string, error) {
	count := 0
	for {
		select {
		case payload := <-requestChan:
			if len(payload.Data) == 0 {
				return payload.RequestID, nil
			}
			count++
			conn.Write(payload.Data)
			continue
		case <-ctx.Done():
			return "", fmt.Errorf("context cancelled")
		}
	}
}

func forwardResponse(ctx context.Context, writer *iot_writer.IoTWriter, conn net.Conn) error {
	slog.Info("forwarding response")
	buf := make([]byte, 1024)
	for {
		conn.SetReadDeadline(time.Now().Add(time.Second * 1))
		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled")
		default:
			n, err := conn.Read(buf)
			if err != nil {
				if errors.Is(err, net.ErrClosed) || errors.Is(err, io.EOF) {
					writer.Flush()
					return nil
				}
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				slog.Info("read error", "err", err)
				return err
			}
			if n == 0 {
				writer.Flush()
				return nil
			}
			writer.Write(buf[:n])
		}
	}
}
