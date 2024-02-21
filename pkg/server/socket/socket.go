package socket

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/aws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type CliDevEvent struct {
	App    string `json:"app"`
	Stage  string `json:"stage"`
	Region string `json:"region"`
}

type Invocation struct {
	ID     string            `json:"id,omitempty"`
	Source string            `json:"source,omitempty"`
	Cold   bool              `json:"cold,omitempty"`
	Input  json.RawMessage   `json:"input,omitempty"`
	Output interface{}       `json:"output,omitempty"`
	Start  int64             `json:"start,omitempty"`
	End    int64             `json:"end,omitempty"`
	Errors []string          `json:"errors"`
	Logs   []InvocationLog   `json:"logs"`
	Report *InvocationReport `json:"report,omitempty"`
}

type InvocationLog struct {
	ID        string `json:"id,omitempty"`
	Timestamp int64  `json:"timestamp,omitempty"`
	Message   string `json:"message,omitempty"`
}

type InvocationReport struct {
	Duration int64  `json:"duration"`
	Init     int64  `json:"init"`
	Size     int64  `json:"size"`
	Memory   int64  `json:"memory"`
	Xray     string `json:"xray"`
}

func Start(ctx context.Context, p *project.Project, mux *http.ServeMux) {

	connected := make(chan *websocket.Conn)
	disconnected := make(chan *websocket.Conn)

	go func() {
		sockets := make(map[*websocket.Conn]struct{})
		invocations := make(map[string]*Invocation)

		invoke := bus.Listen(ctx, &aws.FunctionInvokedEvent{})
		response := bus.Listen(ctx, &aws.FunctionResponseEvent{})
		error := bus.Listen(ctx, &aws.FunctionErrorEvent{})
		log := bus.Listen(ctx, &aws.FunctionLogEvent{})
		stack := bus.Listen(ctx, &project.StackEvent{})

		publish := func(evt interface{}) {
			for ws := range sockets {
				ws.WriteJSON(evt)
			}
		}

		publishInvocation := func(invocation *Invocation) {
			publish(map[string]interface{}{
				"type": "invocation",
				"properties": []*Invocation{
					invocation,
				},
			})
		}

		var complete *project.CompleteEvent

		for {
			select {
			case <-ctx.Done():
				return
			case evt := <-stack:
				if evt.CompleteEvent != nil {
					complete = evt.CompleteEvent
				}
			case ws := <-connected:
				slog.Info("socket connected", "addr", ws.RemoteAddr())
				sockets[ws] = struct{}{}
				ws.WriteJSON(map[string]interface{}{
					"type": "cli.dev",
					"properties": CliDevEvent{
						App:    p.App().Name,
						Stage:  p.App().Stage,
						Region: "us-east-1",
					},
				})
				all := []*Invocation{}
				for _, invocation := range invocations {
					all = append(all, invocation)
				}
				slog.Info("sending invocations", "count", len(all))
				ws.WriteJSON(map[string]interface{}{
					"type":       "invocation",
					"properties": all,
				})
				break
			case ws := <-disconnected:
				slog.Info("socket disconnected", "addr", ws.RemoteAddr())
				delete(sockets, ws)
				break
			case evt := <-invoke:
				source := ""
				if complete != nil {
					for _, resource := range complete.Resources {
						if resource.URN.Name() == evt.FunctionID && resource.Type == "sst:aws:Function" {
							source = string(resource.URN)
						}
					}
				}
				invocation := &Invocation{
					ID:     evt.RequestID,
					Source: source,
					Input:  json.RawMessage(evt.Input),
					Start:  time.Now().UnixMilli(),
					Errors: []string{},
					Logs:   []InvocationLog{},
				}
				invocations[evt.RequestID] = invocation
				publishInvocation(invocation)
				break
			case evt := <-response:
				invocation, ok := invocations[evt.RequestID]
				if ok {
					invocation.Output = json.RawMessage(evt.Output)
					invocation.End = time.Now().UnixMilli()
					invocation.Report = &InvocationReport{
						Duration: invocation.End - invocation.Start,
					}
					publishInvocation(invocation)
				}
				break
			case evt := <-error:
				invocation, ok := invocations[evt.RequestID]
				if ok {
					invocation.End = time.Now().UnixMilli()
					invocation.Report = &InvocationReport{
						Duration: invocation.End - invocation.Start,
					}
					publishInvocation(invocation)
				}
				break
			case evt := <-log:
				invocation, ok := invocations[evt.RequestID]
				if ok {
					invocation.Logs = append(invocation.Logs, InvocationLog{
						ID:        time.Now().String(),
						Timestamp: time.Now().UnixMilli(),
						Message:   evt.Line,
					})
					publishInvocation(invocation)
				}
				break
			}
		}

	}()

	mux.HandleFunc("/socket", func(w http.ResponseWriter, r *http.Request) {
		slog.Info("socket upgrading", "addr", r.RemoteAddr)
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer ws.Close()

		connected <- ws
		defer func() {
			disconnected <- ws
		}()

		for {
			_, _, err := ws.ReadMessage()
			if err != nil {
				break
			}
		}
	})
}
