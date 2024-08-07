package iot_writer

import (
	"encoding/binary"
	"log/slog"
	"strings"
	"time"

	MQTT "github.com/eclipse/paho.mqtt.golang"
)

const BUFFER_SIZE = 1024 * 100

type IoTWriter struct {
	topic  string
	count  int
	client MQTT.Client
	buffer []byte // buffer to accumulate data
	last   time.Time
}

func New(client MQTT.Client, topic string) *IoTWriter {
	return &IoTWriter{
		client: client,
		buffer: make([]byte, 0, BUFFER_SIZE),
		topic:  topic,
		last:   time.Now(),
	}
}

func (iw *IoTWriter) Write(p []byte) (int, error) {
	totalWritten := 0

	for len(p) > 0 {
		// Calculate the space left in the buffer
		spaceLeft := BUFFER_SIZE - len(iw.buffer)

		// Determine how much data to copy to the buffer
		toCopy := min(spaceLeft, len(p))

		// Append data to the buffer
		iw.buffer = append(iw.buffer, p[:toCopy]...)

		// Update the slice p and totalWritten
		p = p[toCopy:]
		totalWritten += toCopy

		// If the buffer is full, write the chunk
		if len(iw.buffer) == BUFFER_SIZE {
			iw.Flush()
		}
	}

	return totalWritten, nil
}

func (iw *IoTWriter) Flush() error {
	if len(iw.buffer) > 0 {
		slog.Info("writing to topic", "topic", iw.topic, "data", len(iw.buffer))
		// encode int to 4 bytes at the beginning of the buffer
		var buf [4]byte
		binary.BigEndian.PutUint32(buf[:], uint32(iw.count))
		iw.buffer = append(buf[:], iw.buffer...)
		iw.count++
		token := iw.client.Publish(iw.topic, 1, false, iw.buffer)
		if token.Wait() && token.Error() != nil {
			return token.Error()
		}
		iw.last = time.Now()
		iw.buffer = iw.buffer[:0]
	}
	return nil
}

func (iw *IoTWriter) Close() error {
	bytes := make([]byte, 4)
	binary.BigEndian.PutUint32(bytes, uint32(iw.count))
	iw.count++
	token := iw.client.Publish(iw.topic, 1, false, bytes)
	if token.Wait() && token.Error() != nil {
		return token.Error()
	}
	return nil
}

type Reader struct {
	buffer map[string]map[int]ReadMsg
	next   map[string]int
}

type ReadMsg struct {
	RequestID string
	Data      []byte
}

func NewReader() *Reader {
	return &Reader{
		buffer: map[string]map[int]ReadMsg{},
		next:   map[string]int{},
	}
}

func (r *Reader) Read(m MQTT.Message) []ReadMsg {
	payload := m.Payload()
	id := int(binary.BigEndian.Uint32(payload[:4]))
	payload = payload[4:]
	topic := m.Topic()
	requestID := strings.Split(topic, "/")[5]
	requestBuffer, ok := r.buffer[requestID]
	slog.Info("iot_writer: processing message", "requestID", requestID)
	if !ok {
		requestBuffer = map[int]ReadMsg{}
		r.buffer[requestID] = requestBuffer
	}
	requestBuffer[id] = ReadMsg{
		Data:      payload,
		RequestID: requestID,
	}
	result := []ReadMsg{}
	for {
		next := r.next[requestID]
		match, ok := requestBuffer[next]
		if !ok {
			break
		}
		delete(requestBuffer, next)
		r.next[requestID]++
		result = append(result, match)
		slog.Info("iot_writer: flushed message", "requestID", requestID, "next", next)
	}
	return result
}

// min returns the smaller of x or y.
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
