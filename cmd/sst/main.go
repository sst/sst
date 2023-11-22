package main

import (
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"

	cli "github.com/urfave/cli/v2"
)

var version = "dev"

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
			color.New(color.FgCyan, color.Bold).Print("SST ❍ Ion " + version + " ")
			color.New(color.FgHiBlack).Print("ready!\n")
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
					printHeader(p)

					s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
					s.Suffix = "  Deploying..."
					s.Start()
					events, err := p.Stack.Deploy()
					if err != nil {
						return err
					}

					timing := make(map[string]time.Time)
					outputs := make(map[string]interface{})
					for evt := range events {
						if evt.ResourcePreEvent != nil {
							if evt.ResourcePreEvent.Metadata.Type == "pulumi:pulumi:Stack" {
								continue
							}
							if evt.ResourcePreEvent.Metadata.Op == apitype.OpSame {
								s.Disable()
								color.New(color.FgHiBlack, color.Bold).Print("|  ")
								color.New(color.FgHiBlack).Println("Skipping ", prettyResourceName(evt.ResourcePreEvent.Metadata.URN))
								continue
							}

							timing[evt.ResourcePreEvent.Metadata.URN] = time.Now()
							if evt.ResourcePreEvent.Metadata.Op == apitype.OpCreate {
								s.Disable()
								color.New(color.FgYellow, color.Bold).Print("|  ")
								color.New(color.FgHiBlack).Println("Creating ", prettyResourceName(evt.ResourcePreEvent.Metadata.URN))
								continue
							}

							if evt.ResourcePreEvent.Metadata.Op == apitype.OpUpdate {
								s.Disable()
								color.New(color.FgYellow, color.Bold).Print("|  ")
								color.New(color.FgHiBlack).Println("Updating ", prettyResourceName(evt.ResourcePreEvent.Metadata.URN))
								continue
							}
						}

						if evt.ResOutputsEvent != nil {
							if evt.ResOutputsEvent.Metadata.Type == "pulumi:pulumi:Stack" {
								outputs = evt.ResOutputsEvent.Metadata.New.Outputs
								continue
							}
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpSame {
								continue
							}
							duration := time.Since(timing[evt.ResOutputsEvent.Metadata.URN]).Milliseconds()
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate {
								s.Disable()
								color.New(color.FgGreen, color.Bold).Print("|  ")
								color.New(color.FgHiBlack).Println("Created  ", prettyResourceName(evt.ResOutputsEvent.Metadata.URN), " in ", duration, "ms")
							}
							if evt.ResOutputsEvent.Metadata.Op == apitype.OpUpdate {
								s.Disable()
								color.New(color.Bold, color.FgGreen).Print("|  ")
								color.New(color.FgHiBlack).Println("Updated  ", prettyResourceName(evt.ResOutputsEvent.Metadata.URN), " in ", duration, "ms")
							}
						}
						s.Enable()
					}
					s.Stop()
					color.New(color.FgGreen, color.Bold).Print("\n✔")
					color.New(color.FgWhite, color.Bold).Println("  Deployed:")
					for k, v := range outputs {
						color.New(color.FgHiBlack).Print("   ")
						color.New(color.FgHiBlack, color.Bold).Print(k + ": ")
						color.New(color.FgWhite).Println(v)
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
	slog.Info("initializing project", "version", version)
	p, err := project.New(version)
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
	slog.Info("loaded cnfig", "app", p.Name(), "stage", p.Stage(), "region", p.Region())

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

	if !p.CheckDeps() {
		err = p.InstallDeps()
		if err != nil {
			return nil, err
		}
	}

	return p, nil
}

func printHeader(p *project.Project) {
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Print("➜  ")

	color.New(color.FgWhite, color.Bold).Print("App:     ")
	color.New(color.FgHiBlack).Println(p.Name())

	color.New(color.FgWhite, color.Bold).Print("   Stage:   ")
	color.New(color.FgHiBlack).Println(p.Stage())

	color.New(color.FgWhite, color.Bold).Print("   Region:  ")
	color.New(color.FgHiBlack).Println(p.Region())

	fmt.Println()
}

func prettyResourceName(input string) string {
	splits := strings.Split(input, "::")
	// take last two
	splits = splits[len(splits)-2:]
	splits[0] = strings.ReplaceAll(splits[0], "bucket:", "")
	joined := strings.Join(splits, "::")
	return joined
}
