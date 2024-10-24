package main

import (
	"fmt"
	"strings"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/pkg/bus"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server"
	"golang.org/x/sync/errgroup"
)

func CmdRemove(c *cli.Cli) error {
	p, err := c.InitProject()
	if err != nil {
		return err
	}
	defer p.Cleanup()

	if p.App().Removal == "forbid" {
		return util.NewReadableError(nil, fmt.Sprintf(`Removing this project is forbidden for the stage "%s". Please update the removal policy and try again.`, p.App().Stage))
	}

	target := []string{}
	if c.String("target") != "" {
		target = strings.Split(c.String("target"), ",")
	}

	var wg errgroup.Group
	defer wg.Wait()
	ui := ui.New(c.Context)
	s, err := server.New()
	if err != nil {
		return err
	}
	wg.Go(func() error {
		defer c.Cancel()
		return s.Start(c.Context, p)
	})
	events := bus.SubscribeAll()
	defer close(events)
	wg.Go(func() error {
		for evt := range events {
			ui.Event(evt)
		}
		return nil
	})
	defer ui.Destroy()
	defer c.Cancel()
	err = p.Run(c.Context, &project.StackInput{
		Command:    "remove",
		Target:     target,
		ServerPort: s.Port,
		Verbose:    c.Bool("verbose"),
	})
	if err != nil {
		return err
	}
	return nil
}
