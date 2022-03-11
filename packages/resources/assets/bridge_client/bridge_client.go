package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"io/ioutil"
	"log"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/lambdacontext"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	"github.com/pion/stun"
	"golang.org/x/net/websocket"
)

var SUBS = map[string]chan interface{}{
	"ping":    make(chan interface{}),
	"success": make(chan interface{}),
	"failure": make(chan interface{}),
}

var ENV_IGNORE = map[string]bool{
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
	"_AWS_XRAY_DAEMON_ADDRESS":        true,
	"_AWS_XRAY_DAEMON_PORT":           true,
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

var sess, err = session.NewSession()
var S3 = s3.New(sess)

var MAX_PACKET_SIZE = 1024 * 24

// Load on cold start
var CONN, BRIDGE, SELF = (func() (*net.UDPConn, *net.UDPAddr, *net.UDPAddr) {
	local, _ := net.ResolveUDPAddr("udp", ":10280")
	bridge, _ := net.ResolveUDPAddr("udp", os.Getenv("SST_DEBUG_BRIDGE"))
	conn, _ := net.ListenUDP("udp", local)
	log.Println("Listening...")
	self := discover(conn)
	register(self)
	go ping(conn, bridge)
	go read(conn)
	log.Println("Waiting for first ping")
	<-SUBS["ping"]
	go func() {
		for {
			<-SUBS["ping"]
		}
	}()

	return conn, bridge, self
})()

func discover(conn *net.UDPConn) *net.UDPAddr {
	server, _ := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)
	conn.WriteToUDP(message.Raw, server)
	for {
		buf := make([]byte, 1024)

		n, _, _ := conn.ReadFromUDP(buf)
		buf = buf[:n]
		if stun.IsMessage(buf) {
			m := new(stun.Message)
			m.Raw = buf
			decErr := m.Decode()
			if decErr != nil {
				log.Println("decode:", decErr)
				break
			}
			var xorAddr stun.XORMappedAddress
			if getErr := xorAddr.GetFrom(m); getErr != nil {
				panic("Failed to get NAT address")
			}
			addr, _ := net.ResolveUDPAddr("udp", xorAddr.String())
			return addr
		}
	}
	panic("Failed to get NAT address")
}

func register(self *net.UDPAddr) {
	log.Println("Registering", self)
	endpoint, _ := url.Parse(os.Getenv("SST_DEBUG_ENDPOINT"))
	conn, err := websocket.Dial(endpoint.String(), "", "http://"+endpoint.Host)
	if err != nil {
		panic(err)
	}
	defer conn.Close()
	err = websocket.JSON.Send(conn, map[string]interface{}{
		"action": "register",
		"body": map[string]interface{}{
			"host": self.IP.String(),
			"port": self.Port,
		},
	})
	if err != nil {
		panic(err)
	}
	conn.Close()
}

type Message struct {
	Type string      `json:"type"`
	Body interface{} `json:"body"`
}

func write(conn *net.UDPConn, to *net.UDPAddr, msg *Message) {
	json, _ := json.Marshal(msg)
	chunks := []string{""}
	for _, c := range json {
		last := len(chunks) - 1
		chunks[last] = chunks[last] + string(c)
		if len(chunks[last]) > MAX_PACKET_SIZE {
			chunks = append(chunks, "")
		}
	}
	length := len(chunks)
	lengthBytes := make([]byte, 2)
	binary.BigEndian.PutUint16(lengthBytes, uint16(length))
	id := uuid.New().String()[:4]
	b := new(bytes.Buffer)
	for index, chunk := range chunks {
		indexBytes := make([]byte, 2)
		binary.BigEndian.PutUint16(indexBytes, uint16(index))
		b.WriteString(id)
		b.Write(lengthBytes)
		b.Write(indexBytes)
		b.WriteString(chunk)
		conn.WriteToUDP(b.Bytes(), to)
		b.Reset()
	}
}

func ping(conn *net.UDPConn, bridge *net.UDPAddr) *Message {
	for {
		write(conn, bridge, &Message{
			Type: "ping",
			Body: "hello",
		})
		time.Sleep(time.Second * 1)
	}
}

// This is terrible and needs refactoring
func read(conn *net.UDPConn) *Message {
	windows := map[string][][]byte{}
out:
	for {
		buffer := make([]byte, 65535)
		read, from, _ := conn.ReadFromUDP(buffer)
		id := string(buffer[:4])
		cache, exists := windows[id]
		length := binary.BigEndian.Uint16(buffer[4:6])
		if !exists {
			cache = make([][]byte, length)
			windows[id] = cache
			if length > 1 {
				expiry := time.Now().Add(10 * time.Second)
				go func() {
					for {
						if time.Now().After(expiry) {
							return
						}
						time.Sleep(time.Millisecond * 50)
						cache, found := windows[id]
						if !found {
							return
						}
						indexes := []int{}
						for index, item := range cache {
							if item != nil {
								continue
							}
							indexes = append(indexes, index)
						}
						write(conn, from, &Message{
							Type: "retry",
							Body: map[string]interface{}{
								"id":      id,
								"indexes": indexes,
							},
						})
					}
				}()
			}
		}
		index := binary.BigEndian.Uint16(buffer[6:8])
		cache[index] = buffer[8:read]

		joined := new(bytes.Buffer)
		for _, item := range cache {
			if item == nil {
				continue out
			}
			joined.Write(item)
		}
		msg := new(Message)
		json.Unmarshal(joined.Bytes(), msg)
		if msg.Type == "big" {
			body := msg.Body.(map[string]interface{})
			bucket := aws.String(body["bucket"].(string))
			key := aws.String(body["key"].(string))
			result, err := S3.GetObject(&s3.GetObjectInput{
				Bucket: bucket,
				Key:    key,
			})
			if err != nil {
				panic(err)
			}
			bytes, err := ioutil.ReadAll(result.Body)
			if err != nil {
				panic(err)
			}
			json.Unmarshal(bytes, msg)
			S3.DeleteObject(&s3.DeleteObjectInput{
				Bucket: bucket,
				Key:    key,
			})
		}
		delete(windows, id)
		c := SUBS[msg.Type]
		c <- msg.Body

	}
}

type LambdaError struct {
	ErrorMessage string        `json:"errorMessage"`
	ErrorType    string        `json:"errorType"`
	StackTrace   []interface{} `json:"stackTrace"`
}

func (l LambdaError) Error() string {
	return l.ErrorMessage
}

func Handler(ctx context.Context, event interface{}) (interface{}, error) {
	lc, _ := lambdacontext.FromContext(ctx)
	log.Println("Sending from", SELF, "to", BRIDGE)

	env := map[string]string{}
	for _, item := range os.Environ() {
		pair := strings.SplitN(item, "=", 2)
		if ENV_IGNORE[pair[0]] {
			continue
		}
		env[pair[0]] = pair[1]
	}

	deadline, _ := ctx.Deadline()
	write(CONN, BRIDGE, &Message{
		Type: "request",
		Body: map[string]interface{}{
			"debugRequestTimeoutInMs": time.Now().Sub(deadline) * time.Millisecond,
			"debugSrcPath":            os.Getenv("SST_DEBUG_SRC_PATH"),
			"debugSrcHandler":         os.Getenv("SST_DEBUG_SRC_HANDLER"),
			"functionId":              os.Getenv("SST_FUNCTION_ID"),
			"event":                   event,
			"context": map[string]interface{}{
				"functionName":       lambdacontext.FunctionVersion,
				"functionVersion":    lambdacontext.FunctionVersion,
				"invokedFunctionArn": lc.InvokedFunctionArn,
				"memoryLimitInMB":    lambdacontext.MemoryLimitInMB,
				"awsRequestId":       lc.AwsRequestID,
				"identity":           lc.Identity,
				"clientContext":      lc.ClientContext,
			},
			"env": env,
		},
	})
	log.Println("Waiting for response")
	select {
	case data := <-SUBS["success"]:
		return data, nil
	case error := <-SUBS["failure"]:
		casted, worked := error.(map[string]interface{})
		// Print stack trace because returning it does not work right now
		if worked {
			for _, item := range casted["stackTrace"].([]interface{}) {
				log.Println(item)
			}
		}
		return nil, LambdaError{
			ErrorMessage: casted["errorMessage"].(string),
			ErrorType:    casted["errorType"].(string),
		}
	}
}

func main() {
	lambda.Start(Handler)
}
