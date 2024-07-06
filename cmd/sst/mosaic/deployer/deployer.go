package deployer

import (
	"context"
	"log/slog"
	"reflect"

	"github.com/sst/ion/cmd/sst/mosaic/bus"
	"github.com/sst/ion/cmd/sst/mosaic/watcher"
	"github.com/sst/ion/pkg/project"
)

type DeployRequestedEvent struct{}
type WatchedFilesEvent struct {
	files []string
}

func Start(ctx context.Context, p *project.Project) error {
	defer slog.Info("deployer done")
	watchedFiles := make(map[string]bool)
	events := bus.Subscribe(ctx, &watcher.FileChangedEvent{}, &DeployRequestedEvent{}, &WatchedFilesEvent{})
	bus.Publish(&DeployRequestedEvent{})
	for {
		slog.Info("deployer waiting for trigger")
		select {
		case <-ctx.Done():
			return nil
		case evt := <-events:
			switch evt := evt.(type) {
			case *WatchedFilesEvent:
				for _, file := range evt.files {
					watchedFiles[file] = true
				}
			case *watcher.FileChangedEvent, *DeployRequestedEvent:
				if evt, ok := evt.(*watcher.FileChangedEvent); !ok || watchedFiles[evt.Path] {
					p.Stack.Run(ctx, &project.StackInput{
						Command: "deploy",
						Dev:     true,
						OnEvent: func(event *project.StackEvent) {
							publishFields(event)
						},
						OnFiles: func(files []string) {
							bus.Publish(&WatchedFilesEvent{files})
						},
					})
				}
			}
			continue
		}
	}
}

func publishFields(v interface{}) {
	val := reflect.ValueOf(v)

	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	if val.Kind() != reflect.Struct {
		bus.Publish(v)
		return
	}

	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		switch field.Kind() {
		case reflect.Struct:
			publishFields(field.Interface())
			break
		case reflect.Ptr, reflect.Interface, reflect.Slice, reflect.Map, reflect.Chan, reflect.Func:
			if !field.IsNil() {
				bus.Publish(field.Interface())
			}
			break
		default:
			// bus.Publish(field.Interface())
		}
	}
}
