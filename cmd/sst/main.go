package main

import (
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"

	cli "github.com/urfave/cli/v2"
)

var version = "dev"

func main() {
	app := &cli.App{
		Name:        "sst",
		Description: "deploy anything",
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
			color.New(color.FgCyan, color.Bold).Print("SST ❍ ion " + version + "  ")
			color.New(color.FgHiBlack).Print("ready!\n")
			return nil
		},
		Commands: []*cli.Command{
			{
				Name:  "deploy",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					printHeader(p)

					events, err := p.Stack.Deploy()
					if err != nil {
						return err
					}
					progress(events)

					return nil
				},
			},
			{
				Name:  "remove",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					printHeader(p)

					events, err := p.Stack.Remove()
					if err != nil {
						return err
					}
					progress(events)

					for evt := range events {
						if evt.ResourcePreEvent != nil {
							slog.Info("got op", "op", evt.ResourcePreEvent.Metadata.Op)
						}
					}
					return nil
				},
			},
			{
				Name:  "refresh",
				Flags: []cli.Flag{},
				Action: func(cli *cli.Context) error {
					p, err := initProject()
					if err != nil {
						return err
					}
					printHeader(p)

					events, err := p.Stack.Refresh()
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
