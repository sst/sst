package tunnel

import (
	"context"
	"log/slog"
	"os"
	"os/exec"
	"strings"

	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/bus"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/tunnel"
)

func Start(ctx context.Context, proj *project.Project) error {
	evts := bus.Subscribe(&project.CompleteEvent{})
	var tun project.Tunnel
	var cmd *exec.Cmd
	tunLogPath := proj.PathLog("tunnel")
	logFile, _ := os.Create(tunLogPath)
	slog.Info("waiting for tunnels")
	for {
		select {
		case <-ctx.Done():
			if cmd != nil {
				util.TerminateProcess(cmd.Process.Pid)
				cmd.Wait()
			}
			return nil
		case evt := <-evts:
			switch evt := evt.(type) {
			case *project.CompleteEvent:
				if len(evt.Tunnels) == 0 {
					continue
				}
				var next project.Tunnel
				for _, item := range evt.Tunnels {
					next = item
				}
				if cmd != nil && tun.IP == next.IP && tun.Username == next.Username && tun.PrivateKey == next.PrivateKey {
					continue
				}
				if cmd != nil && cmd.Process != nil {
					util.TerminateProcess(cmd.Process.Pid)
					cmd.Wait()
				}
				tun = next
				slog.Info("starting tunnel", "ip", tun.IP, "subnets", tun.Subnets)
				subnets := strings.Join(tun.Subnets, ",")
				// run as root
				cmd = exec.Command(
					"sudo", "-E",
					tunnel.BINARY_PATH, "tunnel", "start",
					"--subnets", subnets,
					"--host", tun.IP,
					"--user", tun.Username,
				)
				util.SetProcessGroupID(cmd)
				slog.Info("starting tunnel", "cmd", cmd.Args)
				cmd.Env = append(os.Environ(), "SSH_PRIVATE_KEY="+tun.PrivateKey)
				cmd.Stdout = logFile
				cmd.Stderr = logFile
				err := cmd.Start()
				if err != nil {
					slog.Error("failed to start tunnel", "error", err)
				}
				slog.Info("tunnel started")
			}
		}
	}
}
