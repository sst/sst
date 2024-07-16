package mosaic

import (
	"log/slog"
	"os"

	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/aws"
	"github.com/sst/ion/cmd/sst/mosaic/server"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/pkg/project"
)

func CmdMosaicDeploy(c *cli.Cli) error {
	url := "http://localhost:13557"
	if match, ok := os.LookupEnv("SST_SERVER"); ok {
		url = match
	}
	evts, err := server.Stream(c.Context, url,
		project.StackCommandEvent{},
		project.ConcurrentUpdateEvent{},
		project.StackCommandEvent{},
		project.BuildFailedEvent{},
		apitype.ResourcePreEvent{},
		apitype.ResOpFailedEvent{},
		apitype.ResOutputsEvent{},
		apitype.DiagnosticEvent{},
		project.CompleteEvent{},
		aws.FunctionInvokedEvent{},
		aws.FunctionResponseEvent{},
		aws.FunctionErrorEvent{},
		aws.FunctionLogEvent{},
		aws.FunctionBuildEvent{},
	)
	if err != nil {
		return err
	}

	u := ui.New(c.Context, ui.ProgressModeDev)
	slog.Info("initialized ui")
	u.Header("dev", "app", "foo")
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
