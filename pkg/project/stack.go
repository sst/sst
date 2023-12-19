package project

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"

	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type stack struct {
	project *Project
}

type StackEvent struct {
	apitype.EngineEvent
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

	err := s.project.backend.Lock(s.project.app.Name, s.project.app.Stage)
	if err != nil {
		if errors.Is(err, &provider.LockExistsError{}) {
			return &ConcurrentUpdateError{}
		}
		return err
	}
	defer s.project.backend.Unlock(s.project.app.Name, s.project.app.Stage)

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
	p, err := js.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
		},
		Inject: []string{filepath.Join(s.project.PathTemp(), "src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      import mod from "%v/sst.config.ts";
      await run(mod.run)
    `,
			filepath.Join(s.project.PathTemp(), "src/auto/run.ts"),
			s.project.PathRoot(),
		),
	})
	if err != nil {
		return err
	}

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
}

func (s *stack) Cancel() error {
	return s.project.backend.Cancel(s.project.app.Name, s.project.app.Stage)
}
