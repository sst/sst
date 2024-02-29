package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"path/filepath"
	"reflect"
	"strings"
	"sync"

	//"syscall"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/manifoldco/promptui"

	"github.com/joho/godotenv"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server"

	cli "github.com/urfave/cli/v2"
)

var version = "dev"

var logFile = (func() *os.File {
	logFile, err := os.CreateTemp("", "sst-*.log")
	if err != nil {
		panic(err)
	}
	return logFile
})()

func main() {
	godotenv.Load()
	interruptChannel := make(chan os.Signal, 1)
	signal.Notify(interruptChannel, os.Interrupt)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		<-interruptChannel
		cancel()
	}()

	app := &cli.App{
		Name:        "sst",
		Description: "deploy anything",
		Flags: []cli.Flag{
			&cli.BoolFlag{
				Name: "verbose",
			},
			&cli.StringFlag{
				Name: "stage",
			},
		},
		Before: func(c *cli.Context) error {
			configureLog(c)

			spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
			spin.Suffix = "  First run, setting up environment..."

			if global.NeedsPulumi() {
				spin.Start()
				err := global.InstallPulumi()
				if err != nil {
					return err
				}
			}

			if global.NeedsBun() {
				spin.Start()
				err := global.InstallBun()
				if err != nil {
					return err
				}
			}

			if global.NeedsPlugins() {
				spin.Start()
				err := global.InstallPlugins()
				if err != nil {
					return err
				}
			}

			spin.Stop()

			return nil
		},
		Commands: []*cli.Command{
			{
				Name:  "version",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					fmt.Printf("ion.%s\n", version)
					return nil
				},
			},
			{
				Name:      "import",
				ArgsUsage: "[type] [name] [id]",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name: "parent",
					},
				},
				Action: func(cli *cli.Context) error {
					resourceType := cli.Args().Get(0)
					name := cli.Args().Get(1)
					id := cli.Args().Get(2)
					parent := cli.String("parent")

					p, err := initProject(cli)
					if err != nil {
						return err
					}

					err = p.Stack.Import(cli.Context, &project.ImportOptions{
						Type:   resourceType,
						Name:   name,
						ID:     id,
						Parent: parent,
					})
					if err != nil {
						return err
					}

					return nil
				},
			},
			{
				Name: "state",
				Subcommands: []*cli.Command{
					{
						Name: "edit",
						Action: func(cli *cli.Context) error {
							p, err := initProject(cli)
							if err != nil {
								return err
							}

							err = p.Stack.Lock()
							if err != nil {
								return util.NewReadableError(err, "Could not lock state")
							}
							defer p.Stack.Unlock()

							path, err := p.Stack.PullState()
							if err != nil {
								return util.NewReadableError(err, "Could not pull state")
							}
							editor := os.Getenv("EDITOR")
							if editor == "" {
								editor = "vim"
							}
							cmd := exec.Command(editor, path)
							cmd.Stdin = os.Stdin
							cmd.Stdout = os.Stdout
							cmd.Stderr = os.Stderr
							if err := cmd.Start(); err != nil {
								return util.NewReadableError(err, "Could not start editor")
							}
							if err := cmd.Wait(); err != nil {
								return util.NewReadableError(err, "Editor exited with error")
							}
							return p.Stack.PushState()
						},
					},
				},
			},
			{
				Name: "secrets",
				Subcommands: []*cli.Command{
					{
						Name:      "set",
						ArgsUsage: "[key] [value]",
						Action: func(cli *cli.Context) error {
							p, err := initProject(cli)
							if err != nil {
								return err
							}
							if cli.Args().Len() != 2 {
								return fmt.Errorf("key and value required")
							}

							key := cli.Args().Get(0)
							value := cli.Args().Get(1)
							backend := p.Backend()
							secrets, err := provider.GetSecrets(backend, p.App().Name, p.App().Stage)
							if err != nil {
								return util.NewReadableError(err, "Could not get secrets")
							}
							secrets[key] = value
							err = provider.PutSecrets(backend, p.App().Name, p.App().Stage, secrets)
							if err != nil {
								return util.NewReadableError(err, "Could not set secret")
							}
							fmt.Println("Secret set")
							return nil
						},
					},
					{
						Name: "list",
						Action: func(cli *cli.Context) error {
							p, err := initProject(cli)
							if err != nil {
								return err
							}
							backend := p.Backend()
							secrets, err := provider.GetSecrets(backend, p.App().Name, p.App().Stage)
							if err != nil {
								return util.NewReadableError(err, "Could not get secrets")
							}
							for key, value := range secrets {
								fmt.Println(key, "=", value)
							}
							return nil
						},
					},
				},
			},
			{
				Name:  "shell",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					backend := p.Backend()
					links, err := provider.GetLinks(backend, p.App().Name, p.App().Stage)
					if err != nil {
						return err
					}
					args := cli.Args().Slice()
					if len(args) == 0 {
						args = append(args, "sh")
					}
					cmd := exec.Command(
						args[0],
						args[1:]...,
					)
					cmd.Env = append(cmd.Env,
						os.Environ()...,
					)
					cmd.Env = append(cmd.Env,
						fmt.Sprintf("PS1=%s/%s> ", p.App().Name, p.App().Stage),
					)

					for resource, value := range links {
						jsonValue, err := json.Marshal(value)
						if err != nil {
							return err
						}

						envVar := fmt.Sprintf("SST_RESOURCE_%s=%s", resource, jsonValue)
						cmd.Env = append(cmd.Env, envVar)
					}
					cmd.Stdout = os.Stdout
					cmd.Stderr = os.Stderr
					cmd.Stdin = os.Stdin
					return cmd.Run()
				},
			},
			{
				Name:  "server",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					project, err := initProject(cli)
					if err != nil {
						return err
					}

					s, err := server.New(project)
					if err != nil {
						return err
					}
					interruptChannel := make(chan os.Signal, 1)
					signal.Notify(interruptChannel, os.Interrupt)

					err = s.Start(ctx)
					if err != nil {
						if err == server.ErrServerAlreadyRunning {
							return util.NewReadableError(err, "Server already running")
						}
						return err
					}
					return nil
				},
			},
			{
				Name:  "install",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					cfgPath, err := project.Discover()
					if err != nil {
						return err
					}

					p, err := project.New(&project.ProjectConfig{
						Version: version,
						Config:  cfgPath,
					})
					if err != nil {
						return err
					}

					if !p.CheckPlatform(version) {
						err := p.CopyPlatform(version)
						if err != nil {
							return err
						}
					}

					err = p.Install()
					if err != nil {
						return err
					}

					return nil

				},
			},
			{
				Name:  "dev",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {

					args := cli.Args().Slice()
					hasTarget := len(args) > 0

					cfgPath, err := project.Discover()
					if err != nil {
						return util.NewReadableError(err, "Could not find sst.config.ts")
					}

					stage, err := getStage(cli, cfgPath)
					if err != nil {
						return util.NewReadableError(err, "Could not find stage")
					}

					deployComplete := make(chan *project.CompleteEvent)
					runOnce := false
					var wg sync.WaitGroup
					defer wg.Wait()

					wg.Add(1)
					go func() {
						defer wg.Done()
						if !hasTarget {
							return
						}

						complete := &project.CompleteEvent{}
						select {
						case <-ctx.Done():
							return
						case complete = <-deployComplete:
							break
						}

						cwd, _ := os.Getwd()
						os.Setenv("PATH", os.Getenv("PATH")+":"+filepath.Join(cwd, "node_modules", ".bin"))
						for {
							cmd := exec.Command(
								args[0],
								args[1:]...,
							)

							for dir, receiver := range complete.Receivers {
								dir = filepath.Join(cfgPath, "..", dir)
								if !strings.HasPrefix(dir, cwd) {
									continue
								}
								for key, value := range receiver.Environment {
									cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
								}
								for _, resource := range receiver.Links {
									value := complete.Links[resource]
									jsonValue, _ := json.Marshal(value)
									envVar := fmt.Sprintf("SST_RESOURCE_%s=%s", resource, jsonValue)
									cmd.Env = append(cmd.Env, envVar)
								}
							}
							cmd.Env = append(cmd.Env,
								os.Environ()...,
							)
							cmd.Stdin = os.Stdin
							cmd.Stdout = os.Stdout
							cmd.Stderr = os.Stderr
							processExit := make(chan interface{})
							cmd.Start()
							go func() {
								cmd.Wait()
								processExit <- true
							}()
							runOnce = true

						loop:
							for {
								select {
								case <-ctx.Done():
									if cmd.Process != nil {
										cmd.Process.Signal(os.Interrupt)
										<-processExit
									}
									return
								case <-processExit:
									cancel()
									return
								case nextComplete := <-deployComplete:
									cmd.Process.Signal(os.Interrupt)
									<-processExit
									complete = nextComplete
									break loop
									for key, value := range nextComplete.Links {
										oldValue := complete.Links[key]
										if !reflect.DeepEqual(oldValue, value) {
											cmd.Process.Signal(os.Interrupt)
											cmd.Wait()
											fmt.Println("Restarting...")
											break loop
										}
									}
									continue
								}
							}
						}
					}()

					state := &server.State{}
					fmt.Print("\033[H\033[2J")
					u := ui.New(ui.ProgressModeDev)
					err = server.Connect(cli.Context, server.ConnectInput{
						CfgPath: cfgPath,
						Stage:   stage,
						OnEvent: func(event server.Event) {
							if !hasTarget || !runOnce {
								defer u.Trigger(&event.StackEvent)
								defer u.Event(&event)
								if event.StackEvent.PreludeEvent != nil {
									u.Reset()
								}
							}

							if event.PreludeEvent != nil && hasTarget && runOnce {
								fmt.Println()
								fmt.Println("🔥 SST is deploying, run sst dev to view progress 🔥")
								return
							}

							if event.CompleteEvent != nil {
								if hasTarget {
									if !runOnce && (!event.CompleteEvent.Finished || len(event.CompleteEvent.Errors) > 0) {
										cancel()
										return
									}

									deployComplete <- event.CompleteEvent
								}
							}

							if event.StateEvent != nil {
								next := event.StateEvent.State
								defer func() {
									state = next
								}()

								if state.App == "" && next.App != "" {
									u.Header(
										version,
										next.App,
										next.Stage,
									)
								}
							}

						},
					})
					cancel()
					if err != nil {
						return util.NewReadableError(err, "")
					}

					return nil
				},
			},
			{
				Name:  "deploy",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					ui := ui.New(ui.ProgressModeDeploy)
					defer ui.Destroy()
					ui.Header(version, p.App().Name, p.App().Stage)
					err = p.Stack.Run(ctx, &project.StackInput{
						Command: "up",
						OnEvent: ui.Trigger,
					})
					if err != nil {
						return util.NewReadableError(err, "")
					}
					return nil
				},
			},
			{
				Name:  "remove",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					ui := ui.New(ui.ProgressModeRemove)
					defer ui.Destroy()
					ui.Header(version, p.App().Name, p.App().Stage)
					interruptChannel := make(chan os.Signal, 1)
					signal.Notify(interruptChannel, os.Interrupt)

					ctx, cancel := context.WithCancel(cli.Context)
					go func() {
						<-interruptChannel
						ui.Interrupt()
						cancel()
					}()
					err = p.Stack.Run(ctx, &project.StackInput{
						Command: "destroy",
						OnEvent: ui.Trigger,
					})
					if err != nil {
						return util.NewReadableError(err, "")
					}
					return nil
				},
			},
			{
				Name:  "refresh",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					ui := ui.New(ui.ProgressModeRefresh)
					defer ui.Destroy()
					ui.Header(version, p.App().Name, p.App().Stage)

					interruptChannel := make(chan os.Signal, 1)
					signal.Notify(interruptChannel, os.Interrupt)
					err = p.Stack.Run(ctx, &project.StackInput{
						Command: "refresh",
						OnEvent: ui.Trigger,
					})
					if err != nil {
						return util.NewReadableError(err, "")
					}
					return nil
				},
			},
			{
				Name:  "cancel",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					err = p.Stack.Cancel()
					if err != nil {
						return util.NewReadableError(err, "")
					}
					fmt.Println("Cancelled any pending deploys for", p.App().Name, "/", p.App().Stage)
					return nil
				},
			},
			{
				Name:  "create",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {

					if _, err := os.Stat("sst.config.ts"); err == nil {
						color.New(color.FgRed, color.Bold).Print("❌")
						color.New(color.FgWhite, color.Bold).Println(" sst.config.ts already exists")
						return nil
					}

					template := "vanilla"

					if _, err := os.Stat("next.config.js"); err == nil {
						p := promptui.Select{
							Label:        "Next.js detected, would you like to use the Next.js template?",
							HideSelected: true,
							Items:        []string{"Yes", "No"},
							HideHelp:     true,
						}
						_, result, err := p.Run()
						if err != nil {
							return err
						}

						if result == "Yes" {
							template = "nextjs"
						}
					}

					err := project.Create(template)
					if err != nil {
						return err
					}

					initProject(cli)

					color.New(color.FgGreen, color.Bold).Print("✔")
					color.New(color.FgWhite, color.Bold).Println("  Created new project with '", template, "' template")

					return nil

				},
			},
		},
	}

	err := app.RunContext(ctx, os.Args)
	if err != nil {
		slog.Error("exited with error", "err", err)
		if readableErr, ok := err.(*util.ReadableError); ok {
			msg := readableErr.Error()
			if msg != "" {
				fmt.Println(readableErr.Error())
			}
		} else {
			fmt.Println("Unexpected error occurred. Please check the logs for more details.")
			fmt.Println(err.Error())
		}
		os.Exit(1)
	}

}

func getStage(cli *cli.Context, cfgPath string) (string, error) {
	stage := cli.String("stage")
	if stage == "" {
		stage = project.LoadPersonalStage(cfgPath)
		if stage == "" {
			stage = guessStage()
			if stage == "" {
				for {
					fmt.Print("Enter a stage name for your personal stage: ")
					_, err := fmt.Scanln(&stage)
					if err != nil {
						continue
					}
					if stage == "" {
						continue
					}
					break
				}
			}
			err := project.SetPersonalStage(cfgPath, stage)
			if err != nil {
				return "", err
			}
		}
	}
	godotenv.Load(fmt.Sprintf(".env.%s", stage))
	return stage, nil
}

func initProject(cli *cli.Context) (*project.Project, error) {
	slog.Info("initializing project", "version", version)

	cfgPath, err := project.Discover()
	if err != nil {
		return nil, util.NewReadableError(err, "Could not find sst.config.ts")
	}

	stage, err := getStage(cli, cfgPath)
	if err != nil {
		return nil, util.NewReadableError(err, "Could not find stage")
	}

	p, err := project.New(&project.ProjectConfig{
		Version: version,
		Stage:   stage,
		Config:  cfgPath,
	})
	if err != nil {
		return nil, util.NewReadableError(err, "Could not initialize project")
	}

	if !p.CheckPlatform(version) {
		spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
		spin.Suffix = "  Installing dependencies..."
		spin.Start()
		err := p.CopyPlatform(version)
		if err != nil {
			return nil, util.NewReadableError(err, "Could not copy platform code to project directory")
		}
		err = p.Install()
		if err != nil {
			return nil, util.NewReadableError(err, "Could not install dependencies")
		}
		spin.Stop()
	}

	_, err = logFile.Seek(0, 0)
	if err != nil {
		return nil, err
	}
	nextLogFile, err := os.Create(filepath.Join(p.PathWorkingDir(), "sst.log"))
	if err != nil {
		return nil, util.NewReadableError(err, "Could not create log file")
	}
	_, err = io.Copy(nextLogFile, logFile)
	if err != nil {
		return nil, util.NewReadableError(err, "Could not copy log file")
	}
	logFile = nextLogFile
	configureLog(cli)

	if err := p.LoadProviders(); err != nil {
		return nil, util.NewReadableError(err, err.Error())
	}

	app := p.App()
	slog.Info("loaded config", "app", app.Name, "stage", app.Stage)

	return p, nil
}

func configureLog(cli *cli.Context) {
	writers := []io.Writer{logFile}
	if cli.Bool("verbose") {
		writers = append(writers, os.Stderr)
	}
	writer := io.MultiWriter(writers...)
	slog.SetDefault(
		slog.New(slog.NewTextHandler(writer, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})),
	)
}

func guessStage() string {
	u, err := user.Current()
	if err != nil {
		return ""
	}
	stage := strings.ToLower(u.Username)

	if stage == "root" || stage == "admin" || stage == "prod" || stage == "dev" || stage == "production" {
		return ""
	}

	return stage
}
