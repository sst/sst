package project

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

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
	"golang.org/x/sync/errgroup"
)

type stack struct {
	project    *Project
	passphrase string
}

type StackEvent struct {
	events.EngineEvent
	StdOutEvent           *StdOutEvent
	ConcurrentUpdateEvent *ConcurrentUpdateEvent
}

type StackInput struct {
	OnEvent func(event *StackEvent)
	OnFiles func(files []string)
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

	err := s.lock()
	if err != nil {
		return err
	}
	defer s.unlock()

	tasks, _ := errgroup.WithContext(ctx)
	secrets := map[string]string{}
	passphrase := s.passphrase

	tasks.Go(func() error {
		secrets, err = provider.GetSecrets(s.project.backend, s.project.app.Name, s.project.app.Stage)
		if err != nil {
			return fmt.Errorf("failed to list secrets: %w", err)
		}
		return nil
	})

	if os.Getenv("SST_DISABLE_PASSPHRASE") != "true" && passphrase == "" {
		tasks.Go(func() error {
			passphrase, err = provider.Passphrase(s.project.backend, s.project.app.Name, s.project.app.Stage)
			if err != nil {
				return fmt.Errorf("failed to get passphrase: %w", err)
			}
			s.passphrase = passphrase
			return nil
		})
	}

	if err := tasks.Wait(); err != nil {
		return err
	}

	env, err := s.project.backend.Env()
	if err != nil {
		return err
	}
	for _, value := range os.Environ() {
		pair := strings.SplitN(value, "=", 2)
		if len(pair) == 2 {
			env[pair[0]] = pair[1]
		}
	}

	// env := map[string]string{}
	for key, value := range secrets {
		env["SST_SECRET_"+key] = value
	}
	env["PULUMI_CONFIG_PASSPHRASE"] = passphrase

	cli := map[string]interface{}{
		"command": input.Command,
		"paths": map[string]string{
			"home": global.ConfigDir(),
			"root": s.project.PathRoot(),
			"work": s.project.PathWorkingDir(),
		},
		"env": env,
	}
	cliBytes, err := json.Marshal(cli)
	if err != nil {
		return err
	}
	appBytes, err := json.Marshal(s.project.app)
	if err != nil {
		return err
	}
	buildResult, err := js.Build(js.EvalOptions{
		Dir: s.project.PathWorkingDir(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
		},
		Inject: []string{filepath.Join(s.project.PathWorkingDir(), "src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      import mod from "%v/sst.config.ts";
      const result = await run(mod.run)
      export default result
    `,
			filepath.Join(s.project.PathWorkingDir(), "src/auto/run.ts"),
			s.project.PathRoot(),
		),
	})
	if err != nil {
		return err
	}
	outfile := buildResult.OutputFiles[0].Path

	if input.OnFiles != nil {
		var meta = map[string]interface{}{}
		err := json.Unmarshal([]byte(buildResult.Metafile), &meta)
		if err != nil {
			return err
		}
		files := []string{}
		for key := range meta["inputs"].(map[string]interface{}) {
			absPath, err := filepath.Abs(key)
			if err != nil {
				continue
			}
			files = append(files, absPath)
		}
		input.OnFiles(files)
	}

	ws, err := auto.NewLocalWorkspace(ctx,
		auto.WorkDir(s.project.PathWorkingDir()),
		auto.PulumiHome(global.ConfigDir()),
		auto.Project(workspace.Project{
			Name:    tokens.PackageName(s.project.app.Name),
			Runtime: workspace.NewProjectRuntimeInfo("nodejs", nil),
			Backend: &workspace.ProjectBackend{
				URL: fmt.Sprintf("file://%v", s.project.PathWorkingDir()),
			},
			Main: outfile,
		}),
		auto.EnvVars(
			env,
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
			if provider == "cloudflare" && key == "accountId" {
				continue
			}
			config[fmt.Sprintf("%v:%v", provider, key)] = auto.ConfigValue{Value: value}
		}
	}
	err = stack.SetAllConfig(ctx, config)
	if err != nil {
		return err
	}
	slog.Info("built config")

	if err != nil {
		return err
	}

	stream := make(chan events.EngineEvent)
	eventlog, err := os.Create(filepath.Join(s.project.PathWorkingDir(), "event.log"))
	if err != nil {
		return err
	}
	defer eventlog.Close()

	go func() {
	loop:
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-stream:
				if !ok {
					break loop
				}
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
	defer func() {
		outputs, _ := stack.Outputs(ctx)
		links, ok := outputs["_links"]
		if !ok {
			return
		}
		err := provider.PutLinks(s.project.backend, s.project.app.Name, s.project.app.Stage, links.Value.(map[string]interface{}))
		if err != nil {
		}
	}()
	switch input.Command {
	case "up":
		_, err = stack.Up(ctx,
			optup.ProgressStreams(),
			optup.ErrorProgressStreams(),
			optup.EventStreams(stream),
		)

	case "destroy":
		_, err = stack.Destroy(ctx,
			optdestroy.ProgressStreams(),
			optdestroy.ErrorProgressStreams(),
			optdestroy.EventStreams(stream),
		)

	case "refresh":
		_, err = stack.Refresh(ctx,
			optrefresh.ProgressStreams(),
			optrefresh.ErrorProgressStreams(),
			optrefresh.EventStreams(stream),
		)
	}

	slog.Info("done running stack command")
	if err != nil {
		slog.Info("error running stack command", "err", err)
	}
	return nil
}

func (s *stack) lock() error {
	pulumiDir := filepath.Join(s.project.PathWorkingDir(), ".pulumi")
	err := os.RemoveAll(
		pulumiDir,
	)
	if err != nil {
		return err
	}

	appDir := filepath.Join(pulumiDir, "stacks", s.project.app.Name)
	err = os.MkdirAll(appDir, 0755)
	if err != nil {
		return err
	}

	file, err := os.Create(
		filepath.Join(appDir, fmt.Sprintf("%v.json", s.project.app.Stage)),
	)
	if err != nil {
		return fmt.Errorf("failed to create local state: %w", err)
	}
	defer file.Close()

	slog.Info("locking", "app", s.project.app.Name, "stage", s.project.app.Stage)
	err = s.project.backend.Lock(s.project.app.Name, s.project.app.Stage, file)
	if err != nil {
		if errors.Is(err, &provider.LockExistsError{}) {
			return &ConcurrentUpdateError{}
		}
		return err
	}
	slog.Info("locked")

	return nil
}

func (s *stack) unlock() error {
	pulumiDir := filepath.Join(s.project.PathWorkingDir(), ".pulumi")

	stateFile := filepath.Join(pulumiDir, "stacks", s.project.app.Name, fmt.Sprintf("%v.json", s.project.app.Stage))
	file, err := os.Open(
		stateFile,
	)
	if err != nil {
		return err
	}
	defer file.Close()

	slog.Info("unlocking", "app", s.project.app.Name, "stage", s.project.app.Stage, "state", stateFile)
	err = s.project.backend.Unlock(s.project.app.Name, s.project.app.Stage, file)
	if err != nil {
		return err
	}
	slog.Info("unlocked")

	return nil
}

func (s *stack) Cancel() error {
	return s.project.backend.Cancel(s.project.app.Name, s.project.app.Stage)
}
