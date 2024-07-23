package cloudflare

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	"github.com/cloudflare/cloudflare-go"
	"github.com/gorilla/websocket"
	"github.com/sst/ion/cmd/sst/mosaic/bus"
	"github.com/sst/ion/cmd/sst/mosaic/watcher"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/runtime"
)

type WorkerBuildEvent struct {
	WorkerID string
	Errors   []string
}

type WorkerUpdatedEvent struct {
	WorkerID string
}

type WorkerInvokedEvent struct {
	WorkerID  string
	TailEvent *TailEvent
}

func Start(ctx context.Context, proj *project.Project, args map[string]interface{}) error {
	prov, ok := proj.Provider("cloudflare")
	if !ok {
		return util.NewReadableError(nil, "Cloudflare provider not found in project configuration")
	}
	api := prov.(*provider.CloudflareProvider).Api()
	evts := bus.Subscribe(&project.CompleteEvent{}, &watcher.FileChangedEvent{})
	var complete *project.CompleteEvent
	builds := map[string]*runtime.BuildOutput{}
	type tailRef struct {
		ID         string
		ScriptName string
		Account    *cloudflare.ResourceContainer
	}
	tails := map[string]tailRef{}

exit:
	for {
		select {
		case <-ctx.Done():
			break exit
		case unknown := <-evts:
			switch evt := unknown.(type) {
			case *project.CompleteEvent:
				complete = evt
				for _, warp := range complete.Warps {
					if warp.Runtime != "worker" {
						continue
					}
					var properties runtime.WorkerProperties
					json.Unmarshal(warp.Properties, &properties)
					account := cloudflare.AccountIdentifier(properties.AccountID)
					if _, ok := tails[warp.FunctionID]; !ok {
						slog.Info("cloudflare tail creating", "functionID", warp.FunctionID)
						tail, err := api.StartWorkersTail(ctx, account, properties.ScriptName)
						if err != nil {
							continue
						}
						tails[warp.FunctionID] = tailRef{
							ID:         tail.ID,
							ScriptName: properties.ScriptName,
							Account:    account,
						}
						conn, _, err := websocket.DefaultDialer.DialContext(ctx, tail.URL, http.Header{
							"Sec-WebSocket-Protocol": []string{"trace-v1"},
						})
						if err != nil {
							slog.Info("error dialing websocket", "error", err)
							continue
						}
						go func(functionID string) {
							defer delete(tails, functionID)
							for {
								msg := &TailEvent{}
								err := conn.ReadJSON(msg)
								if err != nil {
									slog.Info("error reading websocket", "error", err)
									return
								}

								bus.Publish(&WorkerInvokedEvent{
									WorkerID:  functionID,
									TailEvent: msg,
								})
							}
						}(warp.FunctionID)
					}

					if _, ok := builds[warp.FunctionID]; ok {
						continue
					}

					output, err := runtime.Build(ctx, &runtime.BuildInput{
						Warp:    warp,
						Dev:     true,
						Project: proj,
					})
					if err != nil {
						continue
					}
					builds[warp.FunctionID] = output
				}
			case *watcher.FileChangedEvent:
				if complete == nil {
					continue
				}
				for workerID, warp := range complete.Warps {
					if warp.Runtime != "worker" {
						continue
					}

					if runtime.ShouldRebuild(warp.Runtime, workerID, evt.Path) {
						output, err := runtime.Build(ctx, &runtime.BuildInput{
							Warp:    warp,
							Dev:     true,
							Project: proj,
						})
						if err != nil {
							continue
						}
						bus.Publish(&WorkerBuildEvent{
							WorkerID: warp.FunctionID,
							Errors:   output.Errors,
						})
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
						bus.Publish(&WorkerUpdatedEvent{
							WorkerID: warp.FunctionID,
						})

					}
				}
				break
			}
		}
	}

	for _, tail := range tails {
		api.DeleteWorkersTail(ctx, tail.Account, tail.ScriptName, tail.ID)
	}

	return nil
}
