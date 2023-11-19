package project

import (
	"encoding/json"
	"fmt"
	"strings"

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

    const stack = await LocalWorkspace.createOrSelectStack({
      program: mod.run,
      projectName: "%s",
      stackName: "%s",
    }, {
      pulumiHome: "%s",
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
		s.project.Name(),
		s.project.Stage(),
		global.ConfigDir(),
		s.project.Name(),
		"s3://"+bootstrap,
		credentials.AccessKeyID, credentials.SecretAccessKey, credentials.SessionToken,
	), nil
}

func (s *stack) run(cmd string) error {
	stack, err := s.runtime()
	if err != nil {
		return err
	}
	err = s.project.process.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.%v({
        onOutput: console.log,
        onEvent: (evt) => console.log("~e" + JSON.stringify(evt)),
      })
    `, stack, cmd),
	})
	if err != nil {
		return err
	}

	for {
		done, line := s.project.process.Scan()
		if done {
			break
		}
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "~e") {
			var evt map[string]interface{}
			err := json.Unmarshal([]byte(line[2:]), &evt)
			if err != nil {
				continue
			}

			// pretty, _ := json.MarshalIndent(evt, "", "  ")
			// fmt.Println(string(pretty))
			continue
		}
		fmt.Println(line)
	}

	return nil
}

func (s *stack) Deploy() error {
	return s.run("up")
}

func (s *stack) Cancel() error {
	return s.run("cancel")
}

func (s *stack) Remove() error {
	return s.run("destroy")
}
