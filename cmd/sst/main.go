package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"os/user"
	"path/filepath"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/manifoldco/promptui"

	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"

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

			if global.NeedsPlugins() {
				fmt.Println("new installation, installing dependencies...")
				err := global.InstallPlugins()
				if err != nil {
					return err
				}
			}
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
				Name:  "deploy",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					ui := ui.New(ui.ProgressModeDeploy)
					defer ui.Destroy()
					ui.Header(version, p)

					interruptChannel := make(chan os.Signal, 1)
					signal.Notify(interruptChannel, os.Interrupt)

					ctx, cancel := context.WithCancel(cli.Context)
					go func() {
						<-interruptChannel
						ui.Interrupt()
						cancel()
					}()

					err = p.Stack.Run(ctx, &project.StackInput{
						Command: "up",
						OnEvent: ui.Trigger,
					})
					if err != nil {
						return err
					}
					ui.Finish()
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
					ui.Header(version, p)

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
						return err
					}
					ui.Finish()
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
					ui.Header(version, p)

					interruptChannel := make(chan os.Signal, 1)
					signal.Notify(interruptChannel, os.Interrupt)

					ctx, cancel := context.WithCancel(cli.Context)
					go func() {
						<-interruptChannel
						ui.Interrupt()
						cancel()
					}()

					err = p.Stack.Run(ctx, &project.StackInput{
						Command: "refresh",
						OnEvent: ui.Trigger,
					})
					if err != nil {
						return err
					}
					ui.Finish()
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
						return err
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

					cfgPath, err := project.Discover()
					if err != nil {
						return err
					}

					spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
					spin.Suffix = "  Installing dependencies..."
					spin.Start()
					if !project.CheckDeps(version, cfgPath) {
						err = project.InstallDeps(version, cfgPath)
						if err != nil {
							return err
						}
					}
					spin.Stop()

					color.New(color.FgGreen, color.Bold).Print("✔")
					color.New(color.FgWhite, color.Bold).Println("  Created new project with '", template, "' template")

					return nil

				},
			},
		},
	}

	err := app.Run(os.Args)
	if err != nil {
		panic(err)
	}

}

func initProject(cli *cli.Context) (*project.Project, error) {
	slog.Info("initializing project", "version", version)

	cfgPath, err := project.Discover()
	if err != nil {
		return nil, err
	}

	if !project.CheckDeps(version, cfgPath) {
		spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
		spin.Suffix = "  Installing dependencies..."
		spin.Start()
		err = project.InstallDeps(version, cfgPath)
		if err != nil {
			return nil, err
		}
		spin.Stop()
	}

	p, err := project.New(&project.ProjectConfig{
		Version: version,
		Stage:   cli.String("stage"),
		Config:  cfgPath,
	})
	if err != nil {
		return nil, err
	}

	_, err = logFile.Seek(0, 0)
	if err != nil {
		return nil, err
	}
	nextLogFile, err := os.Create(filepath.Join(p.PathTemp(), "sst.log"))
	if err != nil {
		return nil, err
	}
	_, err = io.Copy(nextLogFile, logFile)
	if err != nil {
		return nil, err
	}
	logFile = nextLogFile
	configureLog(cli)

	app := p.App()
	if app.Stage == "" {
		p.LoadPersonalStage()
		if app.Stage == "" {
			var stage string
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
			p.SetPersonalStage(stage)
		}
	}
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
