package iot_writer

import (
	"log/slog"
	"time"

	MQTT "github.com/eclipse/paho.mqtt.golang"
)

const BUFFER_SIZE = 1024 * 100

type IoTWriter struct {
	topic  string
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
		token := iw.client.Publish(iw.topic, 1, false, iw.buffer)
		if token.Wait() && token.Error() != nil {
			return token.Error()
		}
		iw.last = time.Now()
		iw.buffer = iw.buffer[:0]
	}
	return nil
}

// min returns the smaller of x or y.
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
