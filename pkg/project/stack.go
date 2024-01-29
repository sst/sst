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
	CompleteEvent         *CompleteEvent
}

type StackInput struct {
	OnEvent func(event *StackEvent)
	OnFiles func(files []string)
	Command string
	Dev     bool
}

type StdOutEvent struct {
	Text string
}

type ConcurrentUpdateEvent struct{}

type ConcurrentUpdateError struct{}

type Links map[string]interface{}

type WarpDefinition struct {
	FunctionID string                 `json:"functionID"`
	Runtime    string                 `json:"runtime"`
	Properties map[string]interface{} `json:"properties"`
	Links      []string               `json:"links"`
}

type Warps map[string]WarpDefinition

type CompleteEvent struct {
	Links    Links
	Warps    Warps
	Outputs  map[string]interface{}
	Hints    map[string]string
	Errors   []Error
	Finished bool
}

type Error struct {
	Message string
	URN     string
}

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
		"dev":     input.Dev,
		"paths": map[string]string{
			"home":     global.ConfigDir(),
			"root":     s.project.PathRoot(),
			"work":     s.project.PathWorkingDir(),
			"platform": s.project.PathPlatformDir(),
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
		Dir: s.project.PathPlatformDir(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
			"$dev": fmt.Sprintf("%v", input.Dev),
		},
		Inject: []string{filepath.Join(s.project.PathWorkingDir(), "platform/src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      import mod from "%v/sst.config.ts";
      const result = await run(mod.run)
      export default result
    `,
			filepath.Join(s.project.PathWorkingDir(), "platform/src/auto/run.ts"),
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

	complete := &CompleteEvent{
		Links:    Links{},
		Warps:    Warps{},
		Hints:    map[string]string{},
		Outputs:  map[string]interface{}{},
		Errors:   []Error{},
		Finished: false,
	}

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-stream:
				if !ok {
					return
				}
				input.OnEvent(&StackEvent{EngineEvent: event})

				if event.DiagnosticEvent != nil && event.DiagnosticEvent.Severity == "error" {
					complete.Errors = append(complete.Errors, Error{
						Message: event.DiagnosticEvent.Message,
						URN:     event.DiagnosticEvent.URN,
					})
				}

				if event.SummaryEvent != nil {
					complete.Finished = true
				}

				bytes, err := json.Marshal(event)
				if err != nil {
					return
				}
				eventlog.Write(bytes)
				eventlog.WriteString("\n")
			}
		}
	}()

	defer func() {
		slog.Info("stack command complete")
		defer input.OnEvent(&StackEvent{CompleteEvent: complete})

		outputs, _ := stack.Outputs(ctx)

		linksOutput, ok := outputs["_links"]
		if ok {
			links := linksOutput.Value.(map[string]interface{})
			for key, value := range links {
				complete.Links[key] = value
			}
			typesFile, _ := os.Create(filepath.Join(s.project.PathWorkingDir(), "types.generated.ts"))
			defer typesFile.Close()
			typesFile.WriteString(`declare module "sst" {` + "\n")
			typesFile.WriteString("  export interface Resource " + inferTypes(links, "  ") + "\n")
			typesFile.WriteString("}" + "\n")
			typesFile.WriteString("export {}")
			provider.PutLinks(s.project.backend, s.project.app.Name, s.project.app.Stage, links)
		}
		delete(outputs, "_links")

		hintsOutput, ok := outputs["_hints"]
		if ok {
			hints := hintsOutput.Value.(map[string]interface{})
			for key, value := range hints {
				str, ok := value.(string)
				if ok {
					complete.Hints[key] = str
				}
			}
		}
		delete(outputs, "_hints")

		warpsOutput, ok := outputs["_warps"]
		if ok {
			warps := warpsOutput.Value.(map[string]interface{})
			for key, value := range warps {
				data, _ := json.Marshal(value)
				var definition WarpDefinition
				json.Unmarshal(data, &definition)
				complete.Warps[key] = definition
			}
		}
		delete(outputs, "_warps")

		for key, value := range outputs {
			complete.Outputs[key] = value.Value
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
