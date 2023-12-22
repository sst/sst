package project

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/pulumi/pulumi/sdk/v3/go/auto"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/events"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optdestroy"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optrefresh"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
	"github.com/pulumi/pulumi/sdk/v3/go/common/tokens"
	"github.com/pulumi/pulumi/sdk/v3/go/common/workspace"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type stack struct {
	project *Project
}

type StackEvent struct {
	events.EngineEvent
	StdOutEvent           *StdOutEvent
	ConcurrentUpdateEvent *ConcurrentUpdateEvent
}

type StackInput struct {
	OnEvent func(event *StackEvent)
	Command string
}

type StdOutEvent struct {
	Text string
}

type ConcurrentUpdateEvent struct{}

type ConcurrentUpdateError struct{}

func (e *ConcurrentUpdateError) Error() string {
	return "Concurrent update detected, run `sst cancel` to delete lock file and retry."
}

type StackEventStream = chan StackEvent

func (s *stack) Run(ctx context.Context, input *StackInput) error {
	slog.Info("running stack command", "cmd", input.Command)

	env, err := s.project.backend.Env()
	if err != nil {
		return err
	}

	cli := map[string]interface{}{
		"command": input.Command,
		"backend": s.project.backend.Url(),
		"paths": map[string]string{
			"home": global.ConfigDir(),
			"root": s.project.PathRoot(),
			"work": s.project.PathTemp(),
		},
		"env": env,
	}
	cliBytes, err := json.Marshal(cli)
	appBytes, err := json.Marshal(s.project.App())
	if err != nil {
		return err
	}
	outfile, err := js.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
		},
		Inject: []string{filepath.Join(s.project.PathTemp(), "src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      import mod from "%v/sst.config.ts";
      const result = await run(mod.run)
      export default result
    `,
			filepath.Join(s.project.PathTemp(), "src/auto/run.ts"),
			s.project.PathRoot(),
		),
	})
	if err != nil {
		return err
	}
	slog.Info("built code")

	ws, err := auto.NewLocalWorkspace(ctx,
		auto.WorkDir(s.project.PathTemp()),
		auto.PulumiHome(global.ConfigDir()),
		auto.Project(workspace.Project{
			Name:    tokens.PackageName(s.project.App().Name),
			Runtime: workspace.NewProjectRuntimeInfo("nodejs", nil),
			Backend: &workspace.ProjectBackend{
				URL: s.project.backend.Url(),
			},
			Main: outfile,
		}),
		auto.EnvVars(
			map[string]string{
				"PULUMI_CONFIG_PASSPHRASE": "",
			},
		),
	)
	if err != nil {
		return err
	}
	slog.Info("built workspace")

	stack, err := auto.UpsertStack(ctx,
		s.project.app.Stage,
		ws,
	)
	if err != nil {
		return err
	}
	slog.Info("built stack")

	config := auto.ConfigMap{}
	for provider, args := range s.project.app.Providers {
		for key, value := range args {
			config[fmt.Sprintf("%v:%v", provider, key)] = auto.ConfigValue{Value: value}
		}
	}
	err = stack.SetAllConfig(ctx, config)
	if err != nil {
		return err
	}
	slog.Info("built config")

	err = s.project.backend.Lock(s.project.app.Name, s.project.app.Stage)
	if err != nil {
		if errors.Is(err, &provider.LockExistsError{}) {
			return &ConcurrentUpdateError{}
		}
		return err
	}
	defer func() {
		s.project.backend.Unlock(s.project.app.Name, s.project.app.Stage)
	}()

	if err != nil {
		return err
	}

	stream := make(chan events.EngineEvent)
	eventlog, err := os.Create(filepath.Join(s.project.PathTemp(), "event.log"))
	if err != nil {
		return err
	}
	defer eventlog.Close()
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-stream:
				input.OnEvent(&StackEvent{EngineEvent: event})
				bytes, err := json.Marshal(event)
				if err != nil {
					return
				}
				eventlog.Write(bytes)
				eventlog.WriteString("\n")
			}
		}
	}()

	slog.Info("running stack command", "cmd", input.Command)
	switch input.Command {
	case "up":
		_, err = stack.Up(ctx,
			optup.ProgressStreams(),
			optup.ErrorProgressStreams(),
			optup.EventStreams(stream),
		)
		if err != nil {
			return err
		}

	case "destroy":
		stack.Destroy(ctx,
			optdestroy.ProgressStreams(),
			optdestroy.ErrorProgressStreams(),
			optdestroy.EventStreams(stream),
		)

	case "refresh":
		stack.Refresh(ctx,
			optrefresh.ProgressStreams(),
			optrefresh.ErrorProgressStreams(),
			optrefresh.EventStreams(stream),
		)
	}

	return nil
}

func (s *stack) Cancel() error {
	return s.project.backend.Cancel(s.project.app.Name, s.project.app.Stage)
}
