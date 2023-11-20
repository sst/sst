package main

import (
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	"github.com/fatih/color"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"
	cli "github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Name:  "sst",
		Usage: "deploy anything",
		Flags: []cli.Flag{
			&cli.BoolFlag{
				Name: "verbose",
			},
		},
		Before: func(c *cli.Context) error {
			level := slog.LevelWarn
			if c.Bool("verbose") {
				level = slog.LevelInfo
			}
			slog.SetDefault(
				slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
					Level: level,
				})),
			)

			if global.NeedsPlugins() {
				fmt.Println("new installation, installing dependencies...")
				err := global.InstallPlugins()
				if err != nil {
					return err
				}
			}
			fmt.Println(color.CyanString("SST ❍ ION  "), color.HiBlackString("ready!"))
			return nil
		},
		Commands: []*cli.Command{
			{
				Name:  "deploy",
				Usage: "Deploy",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					fmt.Println("Deploying")
					events, err := p.Stack.Deploy()
					if err != nil {
						return err
					}

					timing := make(map[string]time.Time)
					for evt := range events {
						if evt.ResourcePreEvent != nil {
							if evt.ResourcePreEvent.Metadata.Op == apitype.OpSame {
								fmt.Println("Not updating", evt.ResourcePreEvent.Metadata.Old.URN)
								continue
							}

							timing[evt.ResourcePreEvent.Metadata.URN] = time.Now()
							if evt.ResourcePreEvent.Metadata.Op == apitype.OpCreate {
								fmt.Println("Creating", evt.ResourcePreEvent.Metadata.URN)
								continue
							}

							if evt.ResourcePreEvent.Metadata.Op == apitype.OpUpdate {
								fmt.Println("Updating", evt.ResourcePreEvent.Metadata.URN)
								continue
							}
						}

						if evt.ResOutputsEvent != nil {
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpSame {
								continue
							}
							duration := time.Since(timing[evt.ResOutputsEvent.Metadata.URN]).Milliseconds()
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate {
								fmt.Println("Created", evt.ResOutputsEvent.Metadata.URN, "in", duration, "ms")
							}
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpUpdate {
								fmt.Println("Updated", evt.ResOutputsEvent.Metadata.URN, "in", duration, "ms")
							}
						}
					}
					return nil
				},
			},
			{
				Name:  "remove",
				Usage: "Remove",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					events, err := p.Stack.Remove()
					if err != nil {
						return err
					}

					for evt := range events {
						if evt.ResourcePreEvent != nil {
							slog.Info("got op", "op", evt.ResourcePreEvent.Metadata.Op)
						}
					}
					return nil
				},
			},
			{
				Name:  "create",
				Usage: "Create",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					err := project.Create()
					if err != nil {
						return err
					}

					return err
				},
			},
			{
				Name:  "cancel",
				Usage: "Cancel",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					events, err := p.Stack.Cancel()
					if err != nil {
						return err
					}

					for evt := range events {
						if evt.ResourcePreEvent != nil {
							log.Println(evt.ResourcePreEvent)
						}
					}
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

func initProject() (*project.Project, error) {
	slog.Info("initializing project")
	p, err := project.New()
	if err != nil {
		return nil, err
	}

	if p.Stage() == "" {
		p.LoadPersonalStage()
		if p.Stage() == "" {
			for {
				var stage string
				fmt.Print("Enter a stage name for your personal stage: ")
				_, err := fmt.Scanln(&stage)
				if err != nil {
					continue
				}
				if stage == "" {
					continue
				}
				p.SetPersonalStage(stage)
				break
			}
		}
	}
	slog.Info("using", "stage", p.Stage())

	_, err = p.AWS.Config()
	if err != nil {
		return nil, err
	}

	if _, err = p.Bootstrap.Bucket(); err != nil {
		return nil, err
	}

	if err := p.GenerateTypes(); err != nil {
		return nil, err
	}

	missingDeps := p.CheckDeps()
	if len(missingDeps) > 0 {
		err = p.InstallDeps(missingDeps)
		if err != nil {
			return nil, err
		}
	}

	return p, nil
}
