package project

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"path/filepath"

	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
)

type stack struct {
	project *Project
}

type StackEvent struct {
	apitype.EngineEvent
	StdOutEvent           *StdOutEvent
	ConcurrentUpdateEvent *ConcurrentUpdateEvent
}

type StdOutEvent struct {
	Text string
}

type ConcurrentUpdateEvent struct{}

type StackEventStream = chan StackEvent

func (s *stack) run(cmd string) (StackEventStream, error) {
	// credentials, err := s.project.AWS.Credentials()
	// if err != nil {
	// 	return nil, err
	// }
	slog.Info("running stack command", "cmd", cmd)
	cli := map[string]interface{}{
		"command": cmd,
		"backend": s.project.Backend(),
		"paths": map[string]string{
			"home": global.ConfigDir(),
			"root": s.project.PathRoot(),
			"work": s.project.PathTemp(),
		},
		"env": s.project.env,
	}
	cliBytes, err := json.Marshal(cli)
	appBytes, err := json.Marshal(s.project.App())
	if err != nil {
		return nil, err
	}
	err = s.project.process.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
		},
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
		return nil, err
	}

	out := make(StackEventStream)
	go func() {
		for {
			cmd, line := s.project.process.Scan()
			if cmd == js.CommandDone {
				break
			}

			if cmd == js.CommandJSON {
				var evt StackEvent
				err := json.Unmarshal([]byte(line), &evt)
				if err != nil {
					continue
				}
				slog.Info("stack event", "event", line)
				out <- evt

			}

			if cmd == js.CommandStdOut {
				if line == "" {
					continue
				}
				out <- StackEvent{
					StdOutEvent: &StdOutEvent{
						Text: line,
					},
				}
			}
		}
		close(out)
	}()

	return out, nil
}

func (s *stack) Deploy() (StackEventStream, error) {
	return s.run("up")
}

func (s *stack) Cancel() (StackEventStream, error) {
	return s.run("cancel")
}

func (s *stack) Remove() (StackEventStream, error) {
	return s.run("destroy")
}

func (s *stack) Refresh() (StackEventStream, error) {
	return s.run("refresh")
}
