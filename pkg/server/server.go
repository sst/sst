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
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/sst/ion/pkg/project"
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
	App      string
	Stage    string
	Links    map[string]interface{}
	Deployed bool
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

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		timer.Stop()
		w.Header().Add("content-type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		events := make(chan *Event)
		s.subscribers = append(s.subscribers, events)
		slog.Info("subscribed", "addr", r.RemoteAddr)
		flusher, _ := w.(http.Flusher)
		ctx := r.Context()
		go func() {
			events <- &Event{
				StateEvent: &StateEvent{
					State: s.state,
				},
			}
			if s.lastEvent != nil {
				events <- s.lastEvent
			}
		}()
	loop:
		for {
			select {
			case event := <-events:
				data, _ := json.Marshal(event)
				w.Write(data)
				w.Write([]byte("\n"))
				flusher.Flush()
				break
			case <-ctx.Done():
				break loop
			}
		}

		for i := 0; i < len(s.subscribers); i++ {
			if s.subscribers[i] == events {
				s.subscribers = append(s.subscribers[:i], s.subscribers[i+1:]...)
				break
			}
		}
		if len(s.subscribers) == 0 {
			cancel()
		}
		slog.Info("done", "addr", r.RemoteAddr)
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

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	err = watcher.Add(s.project.PathRoot())
	if err != nil {
		return err
	}

	go s.server.ListenAndServe()
	defer s.server.Shutdown(ctx)

	for {
		s.project.Stack.Run(ctx, &project.StackInput{
			Command: "up",
			Dev:     true,
			OnEvent: func(event *project.StackEvent) {
				s.broadcast(&Event{StackEvent: *event})

				if event.CompleteEvent != nil {
					s.lastEvent = &Event{StackEvent: *event}
					s.state.Links = event.CompleteEvent.Links
					s.state.Deployed = true
					s.broadcast(&Event{
						StateEvent: &StateEvent{
							State: s.state,
						},
					})
				}
			},
			OnFiles: func(files []string) {
				for _, file := range files {
					s.watchedFiles[file] = true
				}
			},
		})

		defer func() {
			slog.Info("stopping server")
		}()
	loop:
		for {
			select {
			case event, _ := <-watcher.Events:
				if event.Op&fsnotify.Write != fsnotify.Write {
					continue
				}
				slog.Info("file changed", "file", event.Name, "op", event.Op)
				if _, ok := s.watchedFiles[event.Name]; ok {
					break loop
				}
			case <-timer.C:
				cancel()
			case <-ctx.Done():
				return nil
			}
		}
	}
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
