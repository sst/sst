package server

import (
	"context"
	"log/slog"

	"github.com/fsnotify/fsnotify"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/server/bus"
)

type FileChangedEvent struct {
	Path string
}

func startFileWatcher(ctx context.Context, root string) (util.CleanupFunc, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	err = watcher.Add(root)
	if err != nil {
		return nil, err
	}

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Write != fsnotify.Write {
					continue
				}
				slog.Info("file changed", "path", event.Name)
				bus.Publish(&FileChangedEvent{Path: event.Name})
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
