package watcher

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/server/bus"
)

type FileChangedEvent struct {
	Path string
}

func Start(ctx context.Context, root string) (util.CleanupFunc, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	err = watcher.AddWith(root)
	if err != nil {
		return nil, err
	}
	ignoreSubstrings := []string{"node_modules"}

	err = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if strings.HasPrefix(info.Name(), ".") {
				return filepath.SkipDir
			}
			for _, substring := range ignoreSubstrings {
				if strings.Contains(path, substring) {
					return filepath.SkipDir
				}
			}
			slog.Info("watching", "path", path)
			err = watcher.Add(path)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	go func() {
		limiter := map[string]time.Time{}
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				slog.Info("file event", "path", event.Name, "op", event.Op)
				if time.Since(limiter[event.Name]) > 500*time.Millisecond {
					limiter[event.Name] = time.Now()
					bus.Publish(&FileChangedEvent{Path: event.Name})
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	return func() error {
		slog.Info("cleaning up file watcher")
		return watcher.Close()
	}, nil
}
