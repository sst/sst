package main

import (
	"fmt"
	"log/slog"

	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/aws"
	"github.com/sst/ion/cmd/sst/mosaic/cloudflare"
	"github.com/sst/ion/cmd/sst/mosaic/server"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/pkg/project"
)

func CmdUI(c *cli.Cli) error {
	url, err := server.Discover("", "")
	if err != nil {
		return err
	}
	types := []interface{}{}
	filter := c.String("filter")
	if filter == "function" || filter == "" {
		if filter != "" {
			fmt.Println(ui.TEXT_HIGHLIGHT_BOLD.Render("Function Logs"))
			fmt.Println()
			fmt.Println(ui.TEXT_DIM.Render("Waiting for invocations..."))
			fmt.Println()
		}
		types = append(types,
			cloudflare.WorkerBuildEvent{},
			cloudflare.WorkerUpdatedEvent{},
			cloudflare.WorkerInvokedEvent{},
			aws.FunctionInvokedEvent{},
			aws.FunctionResponseEvent{},
			aws.FunctionErrorEvent{},
			aws.FunctionLogEvent{},
			aws.FunctionBuildEvent{},
		)
	}
	if filter == "sst" || filter == "" {
		types = append(types,
			project.StackCommandEvent{},
			project.ConcurrentUpdateEvent{},
			project.StackCommandEvent{},
			project.BuildFailedEvent{},
			apitype.ResourcePreEvent{},
			apitype.ResOpFailedEvent{},
			apitype.ResOutputsEvent{},
			apitype.DiagnosticEvent{},
			project.CompleteEvent{},
		)
	}
	evts, err := server.Stream(c.Context, url, types...)
	if err != nil {
		return err
	}

	u := ui.New(c.Context, ui.WithDev)
	slog.Info("initialized ui")
	if filter == "sst" || filter == "" {
		err = server.Deploy(c.Context, url)
	}
	if err != nil {
		return err
	}
	for {
		select {
		case <-c.Context.Done():
			u.Destroy()
			return nil
		case evt, ok := <-evts:
			if !ok {
				c.Cancel()
				return nil
			}
			u.Event(evt)
		}
	}
}
