package server

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"time"
)

type ConnectInput struct {
	CfgPath string
	Stage   string
	OnEvent func(event Event)
}

func Connect(ctx context.Context, input ConnectInput) error {
	addr, err := findExisting(input.CfgPath, input.Stage)
	if err != nil {
		return err
	}

	if addr == "" {
		slog.Info("no existing server found, starting new one")
		currentExecutable, err := os.Executable()
		if err != nil {
			return err
		}
		cmd := exec.Command(currentExecutable)
		cmd.Env = os.Environ()
		cmd.Args = append(cmd.Args, "--stage", input.Stage, "server")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Start(); err != nil {
			return err
		}
		cmdExited := make(chan error, 1)
		go func() {
			cmdExited <- cmd.Wait()
		}()

		slog.Info("waiting for server to start")
		for {
			addr, _ = findExisting(input.CfgPath, input.Stage)
			if addr != "" {
				break
			}

			select {
			case err := <-cmdExited:
				return err
			case <-time.After(100 * time.Millisecond):
				break
			}
		}
		err = cmd.Process.Release()
		if err != nil {
			return err
		}

	}

	resp, err := http.Get("http://" + addr + "/stream")
	if err != nil {
		fmt.Println(err)
		cleanupExisting(input.CfgPath, input.Stage)
		return Connect(ctx, input)
	}
	defer resp.Body.Close()

	events := make(chan Event)
	go func() {
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 1024*1024), 1024*1024)
		defer close(events)
		for scanner.Scan() {
			line := scanner.Bytes()
			event := Event{}
			err := json.Unmarshal(line, &event)
			if err != nil {
				continue
			}

			select {
			case events <- event:
				break
			case <-ctx.Done():
				return
			}
		}
	}()

	for {
		select {
		case evt, ok := <-events:
			if !ok {
				return nil
			}
			input.OnEvent(evt)
		case <-ctx.Done():
			return nil
		}
	}
}
