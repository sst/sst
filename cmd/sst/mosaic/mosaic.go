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
	"github.com/sst/ion/cmd/sst/mosaic/cloudflare"
	"github.com/sst/ion/cmd/sst/mosaic/deployer"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer"
	"github.com/sst/ion/cmd/sst/mosaic/server"
	"github.com/sst/ion/cmd/sst/mosaic/socket"
	"github.com/sst/ion/cmd/sst/mosaic/watcher"
	"github.com/sst/ion/pkg/project"
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
		if match, ok := os.LookupEnv("SST_SERVER"); ok {
			url = match
		}
		evts, err := server.Stream(c.Context, url, project.CompleteEvent{})
		if err != nil {
			return err
		}
		var cmd *exec.Cmd
		env := map[string]string{}
		for {
			select {
			case <-c.Context.Done():
				fmt.Println("")
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
	os.Setenv("SST_STAGE", p.App().Stage)
	slog.Info("mosaic", "project", p.PathRoot())

	wg.Go(func() error {
		defer c.Cancel()
		return watcher.Start(c.Context, p.PathRoot())
	})

	server, err := server.New()
	if err != nil {
		return err
	}

	wg.Go(func() error {
		defer c.Cancel()
		socket.Start(c.Context, p, server)
		return nil
	})

	os.Setenv("SST_SERVER", fmt.Sprintf("http://localhost:%v", server.Port))
	for name, a := range p.App().Providers {
		args := a
		switch name {
		case "aws":
			wg.Go(func() error {
				defer c.Cancel()
				return aws.Start(c.Context, p, server, args.(map[string]interface{}))
			})
		case "cloudflare":
			wg.Go(func() error {
				defer c.Cancel()
				return cloudflare.Start(c.Context, p, args.(map[string]interface{}))
			})
		}
	}
	wg.Go(func() error {
		defer c.Cancel()
		return server.Start(c.Context, p)
	})

	currentExecutable, _ := os.Executable()

	if !c.Bool("simple") {
		multi := multiplexer.New(c.Context)
		multiEnv := []string{
			fmt.Sprintf("SST_SERVER=http://localhost:%v", server.Port),
			"SST_STAGE=" + p.App().Stage,
		}
		multi.AddProcess("deploy", []string{currentExecutable, "ui", "--filter=sst"}, "⑆", "SST", "", false, multiEnv...)
		multi.AddProcess("function", []string{currentExecutable, "ui", "--filter=function"}, "𝝺", "Function", "", false, multiEnv...)
		wg.Go(func() error {
			defer c.Cancel()
			multi.Start()
			return nil
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
						for _, d := range evt.Devs {
							if d.Command == "" {
								continue
							}
							dir := filepath.Join(cwd, d.Directory)
							slog.Info("mosaic", "dev", d.Name, "directory", dir)
							multi.AddProcess(
								d.Name,
								append([]string{currentExecutable, "mosaic", "--"},
									strings.Split(d.Command, " ")...),
								// 𝝺 λ
								"→",
								d.Name,
								dir,
								true,
								multiEnv...,
							)
						}
						break
					}
				}
			}
		})
	}

	if c.Bool("simple") {
		wg.Go(func() error {
			return CmdUI(c)
		})
	}

	wg.Go(func() error {
		defer c.Cancel()
		return deployer.Start(c.Context, p)
	})

	err = wg.Wait()
	slog.Info("done mosaic", "err", err)
	return err

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
