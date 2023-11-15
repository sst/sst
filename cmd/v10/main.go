package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/sst/v10/pkg/project"
	"github.com/sst/v10/pkg/stack"
	cli "github.com/urfave/cli/v2"
)

func main() {

	app := &cli.App{
		Name:  "v10",
		Usage: "wtf is this",
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
					stack.Deploy(p)
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
					stack.Remove(p)
					return nil
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
					stack.Cancel(p)
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

	_, err = p.GetAwsCredentials()
	if err != nil {
		return nil, err
	}

	missingDeps := p.CheckDeps()
	if len(missingDeps) > 0 {
		p.InstallDeps(missingDeps)
	}

	return p, nil
}
