package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server/bus"
)

type FunctionInvokedEvent struct {
	WorkerID   string          `json:"workerID"`
	FunctionID string          `json:"functionID"`
	Deadline   string          `json:"deadline"`
	Event      json.RawMessage `json:"event"`
}

type DevEvent struct {
	Type       string          `json:"type"`
	Properties json.RawMessage `json:"properties"`
}

func startProviderDev(
	ctx context.Context,
	project *project.Project,
	provider provider.Provider,
) (util.CleanupFunc, error) {
	events := make(chan string)
	cleanup, err := provider.Dev(ctx, project.App().Name, project.App().Stage, events)
	if err != nil {
		return nil, err
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-events:
				if !ok {
					return
				}
				var devEvent DevEvent
				json.Unmarshal([]byte(event), &devEvent)
				slog.Info("dev event", "type", devEvent.Type)

				switch devEvent.Type {
				case "function.invoked":
					var FunctionInvokedEvent FunctionInvokedEvent
					json.Unmarshal(devEvent.Properties, &FunctionInvokedEvent)
					bus.Publish(&FunctionInvokedEvent)
					break
				}
			}

		}
	}()

	return func() error {
		close(events)
		return cleanup()
	}, nil
}

func startDev(ctx context.Context, p *project.Project) (util.CleanupFunc, error) {
	warps := project.Warps{}

	bus.Subscribe(ctx, func(event *project.StackEvent) {
		if event.CompleteEvent != nil {
			warps = event.CompleteEvent.Warps
		}
	})

	bus.Subscribe(ctx, func(event *FunctionInvokedEvent) {
		for _, warp := range warps {
			fmt.Println(warp.FunctionID)
		}
	})

	return func() error {
		return nil
	}, nil
}
