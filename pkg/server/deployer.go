package server

import (
	"context"
	"log/slog"
	"sync"

	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/watcher"
)

func startDeployer(ctx context.Context, p *project.Project) (util.CleanupFunc, error) {
	trigger := make(chan any, 10000)
	mutex := sync.RWMutex{}
	watchedFiles := make(map[string]bool)

	bus.Subscribe(ctx, func(event *watcher.FileChangedEvent) {
		mutex.RLock()
		defer mutex.RUnlock()
		if _, ok := watchedFiles[event.Path]; ok {
			trigger <- true
		}
	})
	deploRequested := bus.Listen(ctx, &DeployRequestedEvent{})

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			p.Stack.Run(ctx, &project.StackInput{
				Command: "deploy",
				Dev:     true,
				OnEvent: func(event *project.StackEvent) {
					bus.Publish(event)
				},
				OnFiles: func(files []string) {
					slog.Info("files changed", "files", len(files))
					mutex.Lock()
					defer mutex.Unlock()
					for _, file := range files {
						watchedFiles[file] = true
					}
				},
			})

			slog.Info("waiting for file changes")
			select {
			case <-ctx.Done():
				return
			case <-deploRequested:
				continue
			case <-trigger:
				continue
			}
		}
	}()

	return func() error {
		slog.Info("cleaning up deployer")
		wg.Wait()
		return nil
	}, nil
}
