package project

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/pulumi/pulumi/sdk/v3/go/auto"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/events"
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
	stack, err := auto.UpsertStack(ctx,
		s.project.app.Stage,
		ws,
	)
	if err != nil {
		return err
	}
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

	/*
		stream := make(chan events.EngineEvent)
		switch input.Command {
		case "up":
			result, err := stack.Up(ctx,
				optup.ProgressStreams(),
				optup.EventStreams(stream),
			)

			for event := range stream {
				input.OnEvent(&StackEvent{
					EngineEvent: event,
				})
			}
			fmt.Println(result, err)
		case "refresh":
			result, err := stack.Refresh(ctx)
			fmt.Println(result, err)
		}
	*/

	cmd := exec.Command("pulumi", input.Command, "-s", s.project.App().Stage, "--non-interactive", "--yes", "--skip-preview", "--event-log", "events.log")
	cmd.Env = append(
		os.Environ(),
		"PULUMI_DEBUG_COMMANDS=1",
		"PULUMI_CONFIG_PASSPHRASE=",
		"PULUMI_DEBUG_COMMANDS=1",
		"PULUMI_HOME="+global.ConfigDir(),
	)
	/*
		for key, value := range env {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%v=%v", key, value))
		}
	*/
	cmd.Dir = s.project.PathTemp()
	// os.WriteFile(
	// 	filepath.Join(s.project.PathTemp(), "Pulumi."+s.project.App().Stage+".yaml"),
	// 	[]byte("encryptionsalt: v1:BRbPRVzMgq0=:v1:hAPqMfsL0nWiYfTV:0hhwOnAGE7+xpHdpLmSN9GQE89/qmA=="),
	// 	0644,
	// )

	f, err := os.Create(filepath.Join(s.project.PathTemp(), "events.log"))
	if err != nil {
		return err
	}
	f.Close()

	// cmd.Stdout = os.Stdout
	// cmd.Stderr = os.Stderr
	cmd.Start()
	go cmd.Wait()

	// Open the file
	file, err := os.Open(
		filepath.Join(s.project.PathTemp(), "events.log"),
	)
	if err != nil {
		return err
	}
	defer file.Close()

	// Create a reader
	reader := bufio.NewReader(file)

	// Continuously read the file
	for {
		select {
		case <-ctx.Done():
			cmd.Process.Kill()
			return nil
		default:
			line, err := reader.ReadString('\n')

			if err != nil {
				if err == io.EOF {
					if cmd.ProcessState != nil && cmd.ProcessState.Exited() {
						return nil
					}
					// Wait before trying to read again
					time.Sleep(100 * time.Millisecond)
					continue
				}
				return err
			}

			var evt StackEvent
			err = json.Unmarshal([]byte(line), &evt)
			if err != nil {
				continue
			}
			slog.Info("stack event", "event", line)
			input.OnEvent(&evt)
			slog.Info("stack event", "event", evt)
		}
	}
	return nil

	/*
		for {
			select {
			case <-ctx.Done():
				p.Kill()
				return nil
			default:
				cmd, line := p.Scan()
				if cmd == js.CommandDone {
					return nil
				}

				if cmd == js.CommandJSON {
					var evt StackEvent
					err := json.Unmarshal([]byte(line), &evt)
					if err != nil {
						continue
					}
					if evt.ConcurrentUpdateEvent != nil {
						return &ConcurrentUpdateError{}
					}
					slog.Info("stack event", "event", line)
					input.OnEvent(&evt)
				}

				if cmd == js.CommandStdOut {
					if line == "" {
						continue
					}
					input.OnEvent(&StackEvent{
						StdOutEvent: &StdOutEvent{
							Text: line,
						},
					})
				}
			}
		}
	*/
}

func (s *stack) Cancel() error {
	return s.project.backend.Cancel(s.project.app.Name, s.project.app.Stage)
}
