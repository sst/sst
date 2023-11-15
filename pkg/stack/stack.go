package stack

import (
	"fmt"
	"strings"

	"github.com/sst/v10/pkg/js"
	"github.com/sst/v10/pkg/project"
)

func runtime(project *project.Project) string {
	return fmt.Sprintf(`
    import * as aws from "@pulumi/aws";
    globalThis.aws = aws
    import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";

    import mod from '%s';
    const stack = await LocalWorkspace.createOrSelectStack({
      program: mod.run,
      projectName: "%s",
      stackName: "%s",
    })
  `, project.PathConfig(), project.Name(), project.Stage(),
	)
}

func env(project *project.Project) ([]string, error) {
	credentials, err := project.GetAwsCredentials()
	if err != nil {
		return nil, err
	}
	return []string{
		"PULUMI_CONFIG_PASSPHRASE=",
		"AWS_ACCESS_KEY_ID=" + credentials.AccessKeyID,
		"AWS_SECRET_ACCESS_KEY=" + credentials.SecretAccessKey,
		"AWS_SESSION_TOKEN=" + credentials.SessionToken,
	}, nil
}

func Deploy(project *project.Project) error {
	env, err := env(project)
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.up({
        onOutput: console.log,
      })
    `, runtime(project)),
		Env: env,
	})
	if err != nil {
		return err
	}
	err = cmd.Start()
	if err != nil {
		return err
	}

	for cmd.Out.Scan() {
		line := strings.TrimSpace(cmd.Out.Text())
		if line == "" {
			continue
		}

		fmt.Println(line)
	}

	cmd.Wait()

	return nil
}

func Remove(project *project.Project) error {
	env, err := env(project)
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.destroy({
        onOutput: console.log,
      })
    `, runtime(project)),
		Env: env,
	})
	if err != nil {
		return err
	}
	err = cmd.Start()
	if err != nil {
		return err
	}

	for cmd.Out.Scan() {
		line := strings.TrimSpace(cmd.Out.Text())
		if line == "" {
			continue
		}

		fmt.Println(line)
	}

	cmd.Wait()

	return nil
}

func Cancel(project *project.Project) error {
	env, err := env(project)
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.cancel({
        onOutput: console.log,
      })
    `, runtime(project)),
		Env: env,
	})
	if err != nil {
		return err
	}
	err = cmd.Start()
	if err != nil {
		return err
	}

	for cmd.Out.Scan() {
		fmt.Println(cmd.Out.Text())
	}

	cmd.Wait()

	return nil
}
