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
	"reflect"
	"syscall"

	awssdk "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/sst/ion/cmd/sst/mosaic/bus"
	"github.com/sst/ion/cmd/sst/mosaic/deployer"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"golang.org/x/sync/errgroup"
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

	var complete *project.CompleteEvent
	var wg errgroup.Group
	wg.Go(func() error {
		evts := bus.Subscribe(&project.CompleteEvent{})
		for {
			select {
			case <-ctx.Done():
				return nil
			case evt := <-evts:
				complete = evt.(*project.CompleteEvent)
			}
		}
	})

	s.Mux.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("content-type", "application/x-ndjson")
		w.WriteHeader(http.StatusOK)
		slog.Info("subscribed", "addr", r.RemoteAddr)
		flusher, _ := w.(http.Flusher)
		flusher.Flush()
		ctx := r.Context()
		events := bus.SubscribeAll()
		if complete != nil {
			go func() {
				events <- complete
			}()
		}
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-events:
				t := reflect.TypeOf(event)
				if t.Kind() == reflect.Ptr {
					t = t.Elem()
				}
				bytes, _ := json.Marshal(event)
				data, _ := json.Marshal(&Message{
					Type:  t.String(),
					Event: json.RawMessage(bytes),
				})
				w.Write(data)
				flusher.Flush()
			}
		}
	})

	s.Mux.HandleFunc(("/api/deploy"), func(w http.ResponseWriter, r *http.Request) {
		slog.Info("deploy requested")
		bus.Publish(&deployer.DeployRequestedEvent{})
	})

	s.Mux.HandleFunc("/api/env", func(w http.ResponseWriter, r *http.Request) {
		directory := r.URL.Query().Get("directory")
		var dev *project.Dev
		cwd, _ := os.Getwd()
		for _, d := range complete.Devs {
			full := filepath.Join(cwd, d.Directory)
			slog.Info("matching dev", "full", full, "directory", directory)
			if full == directory {
				dev = &d
				break
			}
		}
		if dev == nil {
			slog.Info("dev not found", "directory", directory)
			http.Error(w, "dev not found", http.StatusNotFound)
			return
		}
		env := map[string]string{}
		if dev.Aws != nil && dev.Aws.Role != "" {
			prov, _ := p.Provider("aws")
			awsProvider := prov.(*provider.AwsProvider)
			stsClient := sts.NewFromConfig(awsProvider.Config())
			sessionName := "sst-dev"
			slog.Info("assuming role", "role", dev.Aws.Role)
			result, err := stsClient.AssumeRole(r.Context(), &sts.AssumeRoleInput{
				RoleArn:         &dev.Aws.Role,
				RoleSessionName: &sessionName,
				DurationSeconds: awssdk.Int32(3600),
			})
			if err != nil {
				slog.Info("error assuming role", "err", err.Error())
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			env["AWS_ACCESS_KEY_ID"] = *result.Credentials.AccessKeyId
			env["AWS_SECRET_ACCESS_KEY"] = *result.Credentials.SecretAccessKey
			env["AWS_SESSION_TOKEN"] = *result.Credentials.SessionToken
		}
		slog.Info("dev", "links", dev.Links)
		for _, resource := range dev.Links {
			value := complete.Links[resource]
			jsonValue, _ := json.Marshal(value)
			env["SST_RESOURCE_"+resource] = string(jsonValue)
		}
		env["SST_RESOURCE_App"] = fmt.Sprintf(`{"name": "%s", "stage": "%s" }`, p.App().Name, p.App().Stage)
		for key, value := range dev.Environment {
			slog.Info("setting env", "key", key, "value", value)
			env[key] = value
		}
		body, err := json.Marshal(env)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(body)
	})

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
