package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/internal/util"
)

func CmdShell(c *cli.Cli) error {
	p, err := c.InitProject()
	if err != nil {
		return err
	}
	defer p.Cleanup()

	var args []string
	for _, arg := range c.Arguments() {
		args = append(args, strings.Fields(arg)...)
	}
	cwd, _ := os.Getwd()
	currentDir := cwd
	for {
		newPath := filepath.Join(currentDir, "node_modules", ".bin") + string(os.PathListSeparator) + os.Getenv("PATH")
		os.Setenv("PATH", newPath)
		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			break
		}
		currentDir = parentDir
	}
	if len(args) == 0 {
		args = append(args, "sh")
	}
	cmd := exec.Command(
		args[0],
		args[1:]...,
	)
	// Get the environment variables
	cmd.Env = append(cmd.Env,
		fmt.Sprintf("PS1=%s/%s> ", p.App().Name, p.App().Stage),
	)
	complete, err := p.GetCompleted(c.Context)
	if err != nil {
		return err
	}
	target := c.String("target")
	if target != "" {
		cmd.Env = append(cmd.Env, c.Env()...)
		env, err := p.EnvFor(c.Context, complete, target)
		if err != nil {
			return err
		}
		for key, value := range env {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
		}
	}
	if target == "" {
		cmd.Env = append(cmd.Env, os.Environ()...)
		for resource, value := range complete.Links {
			jsonValue, err := json.Marshal(value)
			if err != nil {
				return err
			}
			envVar := fmt.Sprintf("SST_RESOURCE_%s=%s", resource, jsonValue)
			cmd.Env = append(cmd.Env, envVar)
		}
		cmd.Env = append(cmd.Env, fmt.Sprintf(`SST_RESOURCE_App={"name": "%s", "stage": "%s" }`, p.App().Name, p.App().Stage))
		for key, val := range p.Env() {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, val))
		}
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	err = cmd.Run()
	if err != nil {
		return util.NewReadableError(err, err.Error())
	}
	return nil
}
