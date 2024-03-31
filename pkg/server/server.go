package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"

	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/aws"
	"github.com/sst/ion/pkg/server/dev/watcher"
	"github.com/sst/ion/pkg/server/socket"
)

type Server struct {
	server       *http.Server
	project      *project.Project
	watchedFiles map[string]bool
	subscribers  []chan *Event
	state        *State
	lastEvent    *Event
}

type State struct {
	App    string
	Stage  string
	Config string
}

type Event struct {
	project.StackEvent
	StateEvent            *StateEvent
	FunctionInvokedEvent  *aws.FunctionInvokedEvent
	FunctionResponseEvent *aws.FunctionResponseEvent
	FunctionErrorEvent    *aws.FunctionErrorEvent
	FunctionLogEvent      *aws.FunctionLogEvent
	FunctionBuildEvent    *aws.FunctionBuildEvent
}

type StateEvent struct {
	State *State
}

type DeployRequestedEvent struct{}

func resolveServerFile(cfgPath, stage string) string {
	return filepath.Join(project.ResolveWorkingDir(cfgPath), stage+".server")
}

func findExisting(cfgPath, stage string) (string, error) {
	path := resolveServerFile(cfgPath, stage)
	contents, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(contents), nil
}

func cleanupExisting(cfgPath, stage string) error {
	return os.Remove(resolveServerFile(cfgPath, stage))
}

func New(p *project.Project) (*Server, error) {
	result := &Server{
		project:     p,
		subscribers: []chan *Event{},
		watchedFiles: map[string]bool{
			p.PathConfig(): true,
		},
		state: &State{
			Config: p.PathConfig(),
			App:    p.App().Name,
			Stage:  p.App().Stage,
		},
	}
	return result, nil
}

var ErrServerAlreadyRunning = fmt.Errorf("There is already an instance of sst running")

func (s *Server) Start(parentContext context.Context) error {
	timer := time.NewTimer(5 * time.Minute)
	ctx, cancel := context.WithCancel(parentContext)
	defer cancel()

	mux := http.NewServeMux()

	var count int64

	mux.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&count, 1)
		defer atomic.AddInt64(&count, -1)
		timer.Stop()
		w.Header().Add("content-type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		slog.Info("subscribed", "addr", r.RemoteAddr)
		flusher, _ := w.(http.Flusher)
		ctx := r.Context()
		publish := func(event *Event) {
			data, _ := json.Marshal(event)
			w.Write(data)
			w.Write([]byte("\n"))
			flusher.Flush()
		}
		publish(&Event{
			StateEvent: &StateEvent{
				State: s.state,
			},
		})
		publish(s.lastEvent)
		bus.Subscribe(ctx, func(event *aws.FunctionInvokedEvent) {
			publish(&Event{
				FunctionInvokedEvent: event,
			})
		})
		bus.Subscribe(ctx, func(event *aws.FunctionResponseEvent) {
			publish(&Event{
				FunctionResponseEvent: event,
			})
		})
		bus.Subscribe(ctx, func(event *aws.FunctionErrorEvent) {
			publish(&Event{
				FunctionErrorEvent: event,
			})
		})

		bus.Subscribe(ctx, func(event *aws.FunctionLogEvent) {
			publish(&Event{
				FunctionLogEvent: event,
			})
		})

		bus.Subscribe(ctx, func(event *project.StackEvent) {
			publish(&Event{
				StackEvent: *event,
			})
		})

		bus.Subscribe(ctx, func(event *aws.FunctionBuildEvent) {
			publish(&Event{
				FunctionBuildEvent: event,
			})
		})
		<-ctx.Done()
		slog.Info("done", "addr", r.RemoteAddr)
		if atomic.LoadInt64(&count) == 1 {
			cancel()
		}
	})

	mux.HandleFunc(("/api/deploy"), func(w http.ResponseWriter, r *http.Request) {
		bus.Publish(&DeployRequestedEvent{})
	})

	s.server = &http.Server{
		Handler: mux,
	}

	port, err := findAvailablePort()
	if err != nil {
		return ErrServerAlreadyRunning
	}
	s.server.Addr = fmt.Sprintf("0.0.0.0:%d", port)
	slog.Info("server", "addr", s.server.Addr)

	socket.Start(ctx, s.project, mux)
	for name, args := range s.project.App().Providers {
		switch name {
		case "aws":
			cleanup, err := aws.Start(ctx, mux, args.(map[string]interface{}),
				s.project,
				port,
			)
			if err != nil {
				return err
			}
			defer cleanup()
		}
	}

	go s.server.ListenAndServe()
	defer s.server.Shutdown(ctx)
	serverFile := resolveServerFile(s.project.PathConfig(), s.project.App().Stage)
	err = os.WriteFile(
		serverFile,
		[]byte(s.server.Addr),
		0644,
	)
	if err != nil {
		return err
	}
	defer os.Remove(serverFile)

	fileWatcher, err := watcher.Start(ctx, s.project.PathRoot())
	if err != nil {
		return err
	}
	defer fileWatcher()

	deployer, _ := startDeployer(ctx, s.project)
	if err != nil {
		return err
	}
	defer deployer()

	bus.Subscribe(ctx, func(event *project.StackEvent) {
		if event.CompleteEvent != nil {
			s.lastEvent = &Event{
				StackEvent: *event,
			}
		}
		if event.ConcurrentUpdateEvent != nil {
			cancel()
		}
	})

	select {
	case <-timer.C:
		cancel()
	case <-ctx.Done():
		return nil
	}

	slog.Info("server shutting down")

	return nil
}

func (s *Server) broadcast(event *Event) {
	for _, subscriber := range s.subscribers {
		subscriber <- event
	}
}

func findAvailablePort() (int, error) {
	listener, err := net.Listen("tcp", "localhost:13557")
	if err != nil {
		return 0, err
	}
	defer listener.Close()

	addr := listener.Addr().(*net.TCPAddr)
	return addr.Port, nil
}
