package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"sync"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server"
)

func CmdDev(cli *cli.Cli) error {
	if _, ok := os.LookupEnv("SST_SERVER"); ok {
		return mosaic.CmdMosaic(cli)
	}
	var args []string
	for _, arg := range cli.Arguments() {
		args = append(args, strings.Fields(arg)...)
	}
	slog.Info("args", "args", args, "length", len(args))
	hasTarget := len(args) > 0

	cfgPath, err := project.Discover()
	if err != nil {
		return util.NewReadableError(err, "Could not find sst.config.ts")
	}

	stage, err := cli.Stage(cfgPath)
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
			newPath := filepath.Join(currentDir, "node_modules", ".bin") + string(os.PathListSeparator) + os.Getenv("PATH")
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
			cmd.Env = append(cmd.Env,
				os.Environ()...,
			)

			for dir, receiver := range complete.Receivers {
				abs := filepath.Join(cfgPath, "..", dir)
				if !strings.HasPrefix(abs, cwd) {
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

				addr, _ := server.GetExisting(cfgPath, stage)
				result, err := http.Get("http://" + addr + "/api/receiver/env?receiverID=" + dir)
				if err != nil {
					slog.Info("receiver env err", "err", err.Error())
					continue
				}
				defer result.Body.Close()
				if result.StatusCode == http.StatusOK {
					envMap := make(map[string]string)
					if err := json.NewDecoder(result.Body).Decode(&envMap); err != nil {
						slog.Info("error decoding JSON response", "err", err.Error())
						continue
					}
					for key, value := range envMap {
						cmd.Env = append(cmd.Env, key+"="+value)
					}
				} else {
					slog.Info("receiver env non-OK HTTP status", "status", result.Status)
				}

			}
			cmd.Stdin = os.Stdin
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			processExit := make(chan interface{})
			err := cmd.Start()
			if err != nil {
				slog.Error("error starting command", "err", err.Error())
				cli.Cancel()
				return
			}
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
							break loop
						}
					}
					continue
				}
			}
		}
	}()

	state := &server.State{}
	silent := cli.Bool("silent")
	u := ui.New(cli.Context, ui.ProgressModeDev, func(o *ui.Options) {
		o.Silent = silent
	})
	defer u.Destroy()
	err = server.Connect(cli.Context, server.ConnectInput{
		CfgPath: cfgPath,
		Stage:   stage,
		Verbose: cli.Bool("verbose"),
		OnEvent: func(event server.Event) {
			if !silent || !runOnce {
				defer u.StackEvent(&event.StackEvent)
				defer u.Event(&event)
				if event.StackEvent.PreludeEvent != nil {
					u.Reset()
				}
			}
			if event.ConcurrentUpdateEvent != nil {
				cli.Cancel()
				return
			}
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
				if event.StateEvent.State.Config != cfgPath || event.StateEvent.State.Stage != stage {
					ui.Error("There's another \"sst dev\" session running in " + event.StateEvent.State.Config)
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
