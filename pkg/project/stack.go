package project

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

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
	return fmt.Sprintf(`
    import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";
    import mod from '%s';

    import * as _aws from "@pulumi/aws";
    import * as _util from "@pulumi/pulumi";
    globalThis.aws = _aws
    globalThis.util = _util
    globalThis.sst = {
      region: "%s",
      bootstrap: {
        bucket: "%s"
      }
    }

    const stack = await LocalWorkspace.createOrSelectStack({
      program: mod.run,
      projectName: "%s",
      stackName: "%s",
    }, {
      pulumiHome: "%s",
      workDir: "%s",
      projectSettings: {
        name: "%v",
        runtime: "nodejs",
        backend: {
          url: "%v"
        },
      },
      envVars: {
        PULUMI_CONFIG_PASSPHRASE: "",
        PULUMI_EXPERIMENTAL: "1",
        PULUMI_SKIP_CHECKPOINTS: "true",
        AWS_ACCESS_KEY_ID: "%s",
        AWS_SECRET_ACCESS_KEY: "%s",
        AWS_SESSION_TOKEN: "%s",
      }
    })
  `,
		s.project.PathConfig(),
		s.project.Region(),
		bootstrap,
		s.project.Name(),
		s.project.Stage(),
		global.ConfigDir(),
		s.project.PathRoot(),
		s.project.Name(),
		"s3://"+bootstrap,
		credentials.AccessKeyID, credentials.SecretAccessKey, credentials.SessionToken,
	), nil
}

type StackEventStream = chan apitype.EngineEvent

func (s *stack) run(cmd string) (StackEventStream, error) {
	stack, err := s.runtime()
	if err != nil {
		return nil, err
	}
	err = s.project.process.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.%v({
        // onOutput: (line) => console.log(new Date().toISOString(), line),
        onEvent: (evt) => {
          console.log("~e" + JSON.stringify(evt))
          // console.log(JSON.stringify(evt, null, 4))
        },
      })
    `, stack, cmd),
	})
	if err != nil {
		return nil, err
	}

	out := make(StackEventStream)
	go func() {
		for {
			done, line := s.project.process.Scan()
			if done {
				break
			}
			if line == "" {
				continue
			}
			if strings.HasPrefix(line, "~e") {
				var evt apitype.EngineEvent
				err := json.Unmarshal([]byte(line[2:]), &evt)
				if err != nil {
					continue
				}
				slog.Info("stack event", "event", line[2:])
				out <- evt

				continue
			}
			fmt.Println(line)
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
