package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"sync"

	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server"
)

func CmdDev(cli *Cli) error {
	var args []string
	for _, arg := range cli.arguments {
		args = append(args, strings.Fields(arg)...)
	}
	slog.Info("args", "args", args, "length", len(args))
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
		case <-cli.Context.Done():
			return
		case complete = <-deployComplete:
			break
		}

		cwd, _ := os.Getwd()
		currentDir := cwd
		for {
			newPath := filepath.Join(currentDir, "node_modules", ".bin") + os.Getenv("PATH") + string(os.PathListSeparator)
			os.Setenv("PATH", newPath)
			parentDir := filepath.Dir(currentDir)
			if parentDir == currentDir {
				break
			}
			currentDir = parentDir
		}
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
				case <-cli.Context.Done():
					if cmd.Process != nil {
						cmd.Process.Signal(os.Interrupt)
						<-processExit
					}
					return
				case <-processExit:
					cli.Cancel()
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
	// fmt.Print("\033[H\033[2J")
	u := ui.New(ui.ProgressModeDev)
	defer u.Destroy()
	err = server.Connect(cli.Context, server.ConnectInput{
		CfgPath: cfgPath,
		Stage:   stage,
		OnEvent: func(event server.Event) {
			if !hasTarget || !runOnce || true {
				defer u.Trigger(&event.StackEvent)
				defer u.Event(&event)
				if event.StackEvent.PreludeEvent != nil {
					u.Reset()
				}
			}
			if event.ConcurrentUpdateEvent != nil {
				cli.Cancel()
				return
			}
			// if event.PreludeEvent != nil && hasTarget && runOnce {
			// 	fmt.Println()
			// 	color.New(color.FgYellow, color.Bold).Print("~")
			// 	color.New(color.FgWhite, color.Bold).Println("  Deploying")
			// 	return
			// }
			if event.CompleteEvent != nil {
				if hasTarget {
					if !runOnce && (!event.CompleteEvent.Finished || len(event.CompleteEvent.Errors) > 0) {
						cli.Cancel()
						return
					}
					deployComplete <- event.CompleteEvent
				}
			}
			if event.StateEvent != nil {
				if event.StateEvent.State.Config != cfgPath {
					cli.Cancel()
					return
				}
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
	cli.Cancel()
	if err != nil {
		return util.NewReadableError(err, "")
	}

	return nil
}
