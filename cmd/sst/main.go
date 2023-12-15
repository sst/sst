package main

import (
	"fmt"
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
			&cli.StringFlag{
				Name: "stage",
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
					printHeader(p)

					events, err := p.Stack.Deploy()
					if err != nil {
						return err
					}
					progress(ProgressModeDeploy, events)

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
					printHeader(p)

					events, err := p.Stack.Remove()
					if err != nil {
						return err
					}
					progress(ProgressModeRemove, events)

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
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					printHeader(p)

					events, err := p.Stack.Refresh()
					if err != nil {
						return err
					}
					progress(ProgressModeRefresh, events)

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
					p, err := initProject(cli)
					if err != nil {
						return err
					}
					printHeader(p)

					events, err := p.Stack.Cancel()
					if err != nil {
						return err
					}
					progress(ProgressModeCancel, events)

					for evt := range events {
						if evt.ResourcePreEvent != nil {
							slog.Info("got op", "op", evt.ResourcePreEvent.Metadata.Op)
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

func initProject(cli *cli.Context) (*project.Project, error) {
	slog.Info("initializing project", "version", version)

	cfgPath, err := project.Discover()
	if err != nil {
		return nil, err
	}

	if !project.CheckDeps(version, cfgPath) {
		err = project.InstallDeps(version, cfgPath)
		if err != nil {
			return nil, err
		}
	}

	p, err := project.New(&project.ProjectConfig{
		Version: version,
		Stage:   cli.String("stage"),
		Config:  cfgPath,
	})
	if err != nil {
		return nil, err
	}

	app := p.App()
	if app.Stage == "" {
		p.LoadPersonalStage()
		if app.Stage == "" {
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
	slog.Info("loaded config", "app", app.Name, "stage", app.Stage)

	return p, nil
}

func printHeader(p *project.Project) {
	color.New(color.FgCyan, color.Bold).Print("SST ❍ ion " + version + "  ")
	color.New(color.FgHiBlack).Print("ready!\n")
	app := p.App()
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Print("➜  ")

	color.New(color.FgWhite, color.Bold).Printf("%-12s", "App:")
	color.New(color.FgHiBlack).Println(app.Name)

	color.New(color.FgWhite, color.Bold).Printf("   %-12s", "Stage:")
	color.New(color.FgHiBlack).Println(app.Stage)

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
