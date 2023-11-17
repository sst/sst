package project

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/sst/ion/pkg/js"
)

type stack struct {
	project *Project
}

func (s *stack) Login() error {
	slog.Info("logging in")
	bucket, err := s.project.Bootstrap.Bucket()
	if err != nil {
		return err
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	credentialsPath := filepath.Join(
		home,
		".pulumi",
		"credentials.json",
	)
	data, err := os.ReadFile(credentialsPath)

	if err != nil {
		data = []byte("{}")
	}
	var parsed struct {
		Current  string `json:"current"`
		Accounts map[string]interface{}
	}
	err = json.Unmarshal(data, &parsed)
	if err != nil {
		return err
	}
	full := fmt.Sprintf("s3://%v", bucket)
	parsed.Current = full
	if parsed.Accounts == nil {
		parsed.Accounts = map[string]interface{}{}
	}
	parsed.Accounts[full] = map[string]interface{}{
		"lastValidatedAt": "2021-08-31T18:00:00.000Z",
	}

	data, err = json.Marshal(parsed)
	if err != nil {
		return err
	}
	err = os.MkdirAll(filepath.Dir(credentialsPath), 0755)
	if err != nil {
		return err
	}
	err = os.WriteFile(
		credentialsPath,
		data,
		0644,
	)
	if err != nil {
		return err
	}
	slog.Info("logged into", "bucket", full)
	return nil
}

func (s *stack) runtime() string {
	return fmt.Sprintf(`
    import * as aws from "@pulumi/aws";
    import * as util from "@pulumi/pulumi";
    globalThis.aws = aws
    globalThis.util = util
    import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";

    import mod from '%s';
    const stack = await LocalWorkspace.createOrSelectStack({
      program: mod.run,
      projectName: "%s",
      stackName: "%s",
    })
  `, s.project.PathConfig(), s.project.Name(), s.project.Stage(),
	)
}

func (s *stack) env() ([]string, error) {
	credentials, err := s.project.AWS.Credentials()
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

func (s *stack) Deploy() error {
	env, err := s.env()
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.up({
        onOutput: console.log,
      })
    `, s.runtime()),
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

func (s *stack) Cancel() error {
	env, err := s.env()
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.cancel({
        onOutput: console.log,
      })
    `, s.runtime()),
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

func (s *stack) Remove() error {
	env, err := s.env()
	if err != nil {
		return err
	}
	cmd, err := js.Eval(js.EvalOptions{
		Dir: s.project.PathTemp(),
		Code: fmt.Sprintf(`
      %v
      await stack.destroy({
        onOutput: console.log,
      })
    `, s.runtime()),
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
