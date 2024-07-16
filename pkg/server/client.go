package server

import (
	"bufio"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"
)

type ConnectInput struct {
	CfgPath string
	Stage   string
	Verbose bool
	OnEvent func(event Event)
}

func Connect(ctx context.Context, input ConnectInput) error {
	addr, err := GetExisting(input.CfgPath, input.Stage)
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
		cmd.Args = append(cmd.Args, "--stage="+input.Stage, "server")
		if input.Verbose {
			cmd.Args = append(cmd.Args, "--verbose")
		}
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
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
			addr, _ = GetExisting(input.CfgPath, input.Stage)
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

	slog.Info("connecting to server", "addr", addr)
	resp, err := http.Get("http://" + addr + "/stream")
	if err != nil {
		cleanupExisting(input.CfgPath, input.Stage)
		return Connect(ctx, input)
	}
	defer resp.Body.Close()
	slog.Info("got server stream")

	var wg sync.WaitGroup

	err = nil
	wg.Add(1)
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 4096), 1024*1024*100)
		for scanner.Scan() {
			line := scanner.Bytes()
			event := Event{}
			err = json.Unmarshal(line, &event)
			if err != nil {
				continue
			}
			input.OnEvent(event)
		}
		err = scanner.Err()
	}()
	go func() {
		<-ctx.Done()
		resp.Body.Close()
	}()
	wg.Wait()
	return err
}
