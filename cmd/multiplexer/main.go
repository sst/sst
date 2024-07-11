package main

import (
	"context"
	"time"

	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/switcher"
)

func main() {
	// make raw
	ctx := context.Background()
	s := switcher.New(ctx)
	s.AddProcess("1", []string{"/home/thdxr/dev/projects/sst/ion/dist/sst", "dev"}, "sst", "", false)
	s.AddProcess("2", []string{"zsh"}, "shell", "", true)
	s.AddProcess("3", []string{"ping", "google.com"}, "ping", "", true)
	time.Sleep(time.Second * 10)
	s.Shutdown()
}
