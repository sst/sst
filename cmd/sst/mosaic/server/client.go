package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"reflect"

	"github.com/sst/ion/pkg/project"
)

type Message struct {
	Type  string          `json:"type"`
	Event json.RawMessage `json:"event"`
}

type registry struct {
	types map[string]reflect.Type
}

func NewRegistry() *registry {
	return &registry{
		types: make(map[string]reflect.Type),
	}
}

func (r *registry) Register(v interface{}) {
}

func (r *registry) Get(name string) (reflect.Type, bool) {
	t, ok := r.types[name]
	return t, ok
}

func resolveServerFile(cfgPath, stage string) string {
	return filepath.Join(project.ResolveWorkingDir(cfgPath), stage+".server")
}

var ErrServerNotFound = errors.New("server not found")

func Discover(cfgPath string, stage string) (string, error) {
	if env := os.Getenv("SST_SERVER"); env != "" {
		return env, nil
	}
	resolved := resolveServerFile(cfgPath, stage)
	contents, err := os.ReadFile(resolved)
	if err != nil {
		if os.IsNotExist(err) {
			return "", ErrServerNotFound
		}
		return "", err
	}
	return string(contents), nil
}

func Stream(ctx context.Context, url string, types ...interface{}) (chan any, error) {
	out := make(chan any)
	req, err := http.NewRequestWithContext(ctx, "GET", url+"/stream", nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	decoder := json.NewDecoder(resp.Body)

	registry := map[string]reflect.Type{}
	for _, v := range types {
		t := reflect.TypeOf(v)
		if t.Kind() == reflect.Ptr {
			t = t.Elem()
		}
		name := t.String()
		registry[name] = t
	}

	go func() {
		defer close(out)
		defer resp.Body.Close()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				var msg Message
				err := decoder.Decode(&msg)
				if err != nil {
					return
				}
				prototype, ok := registry[msg.Type]
				if !ok {
					continue
				}
				target := reflect.New(prototype).Interface()
				err = json.Unmarshal(msg.Event, target)
				if err != nil {
					continue
				}
				out <- target
			}
		}
	}()

	return out, nil
}

func Env(ctx context.Context, directory string, url string) (map[string]string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url+"/api/env?directory="+directory, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result map[string]string
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func Deploy(ctx context.Context, url string) error {
	req, err := http.NewRequestWithContext(ctx, "POST", url+"/api/deploy", nil)
	if err != nil {
		return err
	}
	_, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	return nil
}
