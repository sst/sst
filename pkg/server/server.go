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
	subscribers  []chan *project.StackEvent
}

func resolveServerFile(cfgPath, stage string) string {
	return filepath.Join(project.ResolveWorkingDir(cfgPath), stage+".server")
}

func FindExisting(cfgPath, stage string) (string, error) {
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

func New(p *project.Project) (*Server, error) {
	result := &Server{
		project:     p,
		subscribers: []chan *project.StackEvent{},
		watchedFiles: map[string]bool{
			p.PathConfig(): true,
		},
	}
	return result, nil
}

func (s *Server) Start(parentContext context.Context) error {
	timer := time.NewTimer(5 * time.Minute)
	timer.Stop()

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		timer.Stop()
		w.Header().Add("content-type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		events := make(chan *project.StackEvent)
		s.subscribers = append(s.subscribers, events)
		slog.Info("subscribed", "addr", r.RemoteAddr)
		flusher, _ := w.(http.Flusher)
		ctx := r.Context()
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
			timer.Reset(5 * time.Minute)
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

	ctx, cancel := context.WithCancel(parentContext)
	defer cancel()

	go s.server.ListenAndServe()
	defer s.server.Shutdown(ctx)

	for {
		s.project.Stack.Run(ctx, &project.StackInput{
			Command: "up",
			OnEvent: func(event *project.StackEvent) {
				for _, subscriber := range s.subscribers {
					subscriber <- event
				}
			},
			OnFiles: func(files []string) {
				for _, file := range files {
					s.watchedFiles[file] = true
				}
			},
		})

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

func findAvailablePort() (int, error) {
	// Try to bind to a random available port
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()

	// Get the actual address that was bound (including the port)
	addr := listener.Addr().(*net.TCPAddr)
	return addr.Port, nil
}
