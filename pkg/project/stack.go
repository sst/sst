package project

import (
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
)

type stack struct {
	project *Project
}

func (s *stack) runtime() (string, error) {
	credentials, err := s.project.AWS.Credentials()
	if err != nil {
		return "", err
	}
	bootstrap, err := s.project.Bootstrap.Bucket()
	if err != nil {
		return "", err
	}
	inject := map[string]interface{}{
		"stage": s.project.Stage(),
		"name":  s.project.Name(),
		"removalPolicy": s.project.RemovalPolicy(),
		"paths": map[string]string{
			"root": s.project.PathRoot(),
			"temp": s.project.PathTemp(),
			"home": global.ConfigDir(),
		},
		"aws": map[string]string{
			"region":                s.project.Region(),
			"AWS_ACCESS_KEY_ID":     credentials.AccessKeyID,
			"AWS_SECRET_ACCESS_KEY": credentials.SecretAccessKey,
			"AWS_SESSION_TOKEN":     credentials.SessionToken,
			"AWS_DEFAULT_REGION":    s.project.Region(),
		},
		"bootstrap": map[string]string{
			"bucket": bootstrap,
		},
	}
	injectBytes, err := json.Marshal(inject)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`
    globalThis.app = %v
    import * as _aws from "@pulumi/aws";
    import * as _util from "@pulumi/pulumi";
    import * as _sst from "./src/components"

    globalThis.aws = _aws;
    globalThis.util = _util;
    globalThis.sst = _sst;

    import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";
    import mod from '%s';

    const stack = await LocalWorkspace.createOrSelectStack(
      {
        program: mod.run,
        projectName: app.name,
        stackName: app.stage,
      },
      {
        pulumiHome: app.paths.home,
        projectSettings: {
          main: app.paths.root,
          name: app.name,
          runtime: "nodejs",
          backend: {
            url: "s3://" + app.bootstrap.bucket,
          },
        },
        envVars: {
          PULUMI_CONFIG_PASSPHRASE: "",
          PULUMI_SKIP_UPDATE_CHECK: "true",
          PULUMI_EXPERIMENTAL: "1",
          PULUMI_SKIP_CHECKPOINTS: "true",
          NODE_PATH: app.paths.temp + "/node_modules",
          ...app.aws,
        },
      },
    );
  `, string(injectBytes), s.project.PathConfig(),
	), nil
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
	stack, err := s.runtime()
	if err != nil {
		return nil, err
	}
	err = s.project.process.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      try {
        const result = await stack.%v({
          // onOutput: (line) => console.log(line),
          logVerbosity: 11,
          onEvent: (evt) => {
            console.log("~j" + JSON.stringify(evt))
          },
        })
      } catch (e) {
        if (e.name === 'ConcurrentUpdateError') {
          console.log("~j" + JSON.stringify({ConcurrentUpdateEvent: {}}))
        } 
      }
    `, stack, cmd),
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
