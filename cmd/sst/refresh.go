package main

import (
	"strings"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/pkg/project"
	"golang.org/x/sync/errgroup"
)

func CmdRefresh(c *cli.Cli) error {
	p, err := c.InitProject()
	if err != nil {
		return err
	}
	defer p.Cleanup()

	target := []string{}
	if c.String("target") != "" {
		target = strings.Split(c.String("target"), ",")
	}

	var wg errgroup.Group
	defer wg.Wait()
	out := make(chan interface{})
	defer close(out)
	ui := ui.New(c.Context)
	wg.Go(func() error {
		for evt := range out {
			ui.Event(evt)
		}
		return nil
	})
	defer ui.Destroy()
	err = p.Run(c.Context, &project.StackInput{
		Command: "refresh",
		Out:     out,
		Target:  target,
	})
	if err != nil {
		return err
	}
	return nil
}
