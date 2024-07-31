package server

import (
	"context"
	"fmt"
	"github.com/sst/ion/pkg/project"
	"golang.org/x/sync/errgroup"
	"log/slog"
	"net"
	"net/http"
	"os"
	"syscall"
)

type Server struct {
	Port int
	Mux  *http.ServeMux
}

func New() (*Server, error) {
	port, err := port()
	if err != nil {
		return nil, err
	}
	return &Server{
		Port: port,
		Mux:  http.NewServeMux(),
	}, nil
}

func (s *Server) Start(ctx context.Context, p *project.Project) error {
	defer slog.Info("server done")
	var wg errgroup.Group
	server := &http.Server{
		Handler: s.Mux,
	}
	server.Addr = fmt.Sprintf("0.0.0.0:%d", s.Port)
	slog.Info("server", "addr", server.Addr)
	serverPath := resolveServerFile(p.PathConfig(), p.App().Stage)
	os.WriteFile(serverPath, []byte("http://"+server.Addr), 0644)
	defer os.Remove(serverPath)
	wg.Go(func() error {
		go server.ListenAndServe()
		<-ctx.Done()
		server.Shutdown(ctx)
		return nil
	})
	return wg.Wait()
}

func port() (int, error) {
	port := 13557
	for {
		listener, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", port))
		if err != nil {
			if opError, ok := err.(*net.OpError); ok && opError.Op == "listen" {
				if syscallErr, ok := opError.Err.(*os.SyscallError); ok && syscallErr.Syscall == "bind" {
					if errno, ok := syscallErr.Err.(syscall.Errno); ok && errno == syscall.EADDRINUSE {
						port++
						continue
					}
				}
			}
			return 0, err
		}
		defer listener.Close()
		addr := listener.Addr().(*net.TCPAddr)
		return addr.Port, nil
	}
}
