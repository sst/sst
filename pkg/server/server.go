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
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/aws"
	"github.com/sst/ion/pkg/server/dev/watcher"
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
	App   string
	Stage string
}

type Event struct {
	project.StackEvent
	StateEvent *StateEvent
}

type StateEvent struct {
	State *State
}

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
			App:   p.App().Name,
			Stage: p.App().Stage,
		},
	}
	return result, nil
}

func (s *Server) Start(parentContext context.Context) error {
	timer := time.NewTimer(5 * time.Minute)
	ctx, cancel := context.WithCancel(parentContext)
	defer cancel()

	// warps := project.Warps{}

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
		bus.Subscribe(ctx, func(event *project.StackEvent) {
			publish(&Event{
				StackEvent: *event,
			})
		})
		<-ctx.Done()
		slog.Info("done", "addr", r.RemoteAddr)
		if atomic.LoadInt64(&count) == 1 {
			cancel()
		}
	})

	s.server = &http.Server{
		Handler: mux,
	}

	port, err := findAvailablePort()
	if err != nil {
		return err
	}
	port = 44149
	s.server.Addr = fmt.Sprintf("0.0.0.0:%d", port)
	slog.Info("server", "addr", s.server.Addr)

	for _, p := range s.project.Providers {
		switch casted := p.(type) {
		case *provider.AwsProvider:
			cleanup, err := aws.Start(ctx, mux, casted,
				s.project,
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
	})

	select {
	case <-timer.C:
		cancel()
	case <-ctx.Done():
		return nil
	}

	return nil
}

func (s *Server) broadcast(event *Event) {
	for _, subscriber := range s.subscribers {
		subscriber <- event
	}
}

func findAvailablePort() (int, error) {
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()

	addr := listener.Addr().(*net.TCPAddr)
	return addr.Port, nil
}
