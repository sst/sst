package mosaic

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/aws"
	"github.com/sst/ion/cmd/sst/mosaic/bus"
	"github.com/sst/ion/cmd/sst/mosaic/deployer"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer"
	"github.com/sst/ion/cmd/sst/mosaic/server"
	"github.com/sst/ion/cmd/sst/mosaic/watcher"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server/dev/cloudflare"
	"golang.org/x/sync/errgroup"
)

func CmdMosaic(c *cli.Cli) error {
	cwd, _ := os.Getwd()
	var wg errgroup.Group
	var args []string
	for _, arg := range c.Arguments() {
		args = append(args, strings.Fields(arg)...)
	}
	if len(args) > 0 {
		url := "http://localhost:13557"
		evts, err := server.Stream(c.Context, url, project.CompleteEvent{})
		if err != nil {
			return err
		}
		var cmd *exec.Cmd
		env := map[string]string{}
		for {
			select {
			case <-c.Context.Done():
				return nil
			case _, ok := <-evts:
				if !ok {
					return nil
				}
				nextEnv, err := server.Env(c.Context, cwd, url)
				if err != nil {
					return err
				}
				if diff(env, nextEnv) {
					if cmd != nil {
						cmd.Process.Signal(syscall.SIGINT)
						cmd.Wait()
						fmt.Println("restarting...")
					}
					cmd := exec.Command(
						args[0],
						args[1:]...,
					)
					cmd.Env = os.Environ()
					for k, v := range nextEnv {
						cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
					}
					cmd.Stdin = os.Stdin
					cmd.Stdout = os.Stdout
					cmd.Stderr = os.Stderr
					cmd.Start()
				}
				env = nextEnv
			}
		}
	}

	p, err := c.InitProject()
	if err != nil {
		return err
	}
	slog.Info("mosaic", "project", p.PathRoot())

	wg.Go(func() error {
		defer c.Cancel()
		return watcher.Start(c.Context, p.PathRoot())
	})

	server, err := server.New()
	if err != nil {
		return err
	}
	for name, args := range p.App().Providers {
		switch name {
		case "aws":
			wg.Go(func() error {
				defer c.Cancel()
				return aws.Start(c.Context, p, server, args.(map[string]interface{}))
			})
		case "cloudflare":
			cleanup, err := cloudflare.Start(c.Context, p, args.(map[string]interface{}))
			if err != nil {
				return err
			}
			defer cleanup()
		}
	}
	wg.Go(func() error {
		defer c.Cancel()
		return server.Start(c.Context, p)
	})

	currentExecutable, _ := os.Executable()
	multi, err := multiplexer.New()
	multi.AddPane("deploy", []string{currentExecutable, "mosaic-deploy"}, "Deploy", "", false)
	multi.AddPane("shell", []string{currentExecutable, "shell"}, "Shell", "", true)

	wg.Go(func() error {
		defer c.Cancel()
		return multi.Start()
	})

	wg.Go(func() error {
		evts := bus.Subscribe(&project.CompleteEvent{})
		defer c.Cancel()
		for {
			select {
			case <-c.Context.Done():
				return nil
			case unknown := <-evts:
				switch evt := unknown.(type) {
				case *project.CompleteEvent:
					for _, r := range evt.Receivers {
						if r.Dev.Command == "" {
							continue
						}
						dir := filepath.Join(cwd, r.Directory)
						slog.Info("mosaic", "receiver", r.Name, "directory", dir)
						multi.AddPane(r.Name, append([]string{currentExecutable, "mosaic"}, strings.Split(r.Dev.Command, " ")...), r.Name, dir, true)
					}
					break
				}
			}
		}
	})

	wg.Go(func() error {
		defer c.Cancel()
		return deployer.Start(c.Context, p)
	})

	return wg.Wait()
}

func diff(a map[string]string, b map[string]string) bool {
	if len(a) != len(b) {
		return true
	}
	for k, v := range a {
		if strings.HasPrefix(k, "AWS_") {
			continue
		}
		if b[k] != v {
			return true
		}
	}
	return false
}
