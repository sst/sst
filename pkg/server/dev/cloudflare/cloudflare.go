package cloudflare

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/cloudflare/cloudflare-go"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/runtime"
	"github.com/sst/ion/pkg/server/bus"
	"github.com/sst/ion/pkg/server/dev/watcher"
)

type WorkerBuildEvent struct {
	WorkerID string
}

func Start(ctx context.Context, proj *project.Project, args map[string]interface{}) (util.CleanupFunc, error) {
	prov, ok := proj.Provider("cloudflare")
	if !ok {
		return nil, util.NewReadableError(nil, "Cloudflare provider not found in project configuration")
	}
	api := prov.(*provider.CloudflareProvider).Api()
	stackEvents := bus.Listen(ctx, &project.StackEvent{})
	fileEvents := bus.Listen(ctx, &watcher.FileChangedEvent{})
	var complete *project.CompleteEvent
	builds := map[string]*runtime.BuildOutput{}

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-stackEvents:
				if event.CompleteEvent != nil {
					for _, warp := range event.CompleteEvent.Warps {
						if warp.Runtime != "worker" {
							continue
						}
						if _, ok := builds[warp.FunctionID]; ok {
							continue
						}

						output, err := runtime.Build(ctx, &runtime.BuildInput{
							Warp:    warp,
							Links:   event.CompleteEvent.Links,
							Dev:     true,
							Project: proj,
						})
						if err != nil {
							continue
						}
						builds[warp.FunctionID] = output
					}
					complete = event.CompleteEvent
				}
			case file := <-fileEvents:
				if complete == nil {
					continue
				}
				for functionID, warp := range complete.Warps {
					if runtime.ShouldRebuild(warp.Runtime, functionID, file.Path) {
						output, err := runtime.Build(ctx, &runtime.BuildInput{
							Warp:    warp,
							Links:   complete.Links,
							Dev:     true,
							Project: proj,
						})
						if err != nil {
							continue
						}
						builds[warp.FunctionID] = output
						var properties runtime.WorkerProperties
						json.Unmarshal(warp.Properties, &properties)
						account := cloudflare.AccountIdentifier(properties.AccountID)

						content, err := os.ReadFile(filepath.Join(output.Out, output.Handler))
						if err != nil {
							slog.Info("error reading file", "error", err, "out", filepath.Join(output.Out, output.Handler))
							continue
						}
						slog.Info("updating worker script", "functionID", warp.FunctionID)
						_, err = api.UpdateWorkersScriptContent(ctx, account, cloudflare.UpdateWorkersScriptContentParams{
							ScriptName: properties.ScriptName,
							Script:     string(content),
							Module:     true,
						})
						if err != nil {
							slog.Info("error updating worker script", "error", err)
						}
						slog.Info("done worker script", "functionID", warp.FunctionID)

					}
				}
				break
			}
		}
	}()

	return func() error {
		return nil
	}, nil
}
