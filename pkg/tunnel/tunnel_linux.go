package tunnel

import (
	"context"
	"log/slog"
	"os/exec"
	"runtime"
)

func Start(ctx context.Context, routes ...string) error {
	name := resolveInterface()
	slog.Info("creating interface", "name", name, "os", runtime.GOOS)
	destroy()
	cmds := [][]string{
		{"ip", "tuntap", "add", name, "mode", "tun"},
		{"ip", "addr", "add", "172.16.0.1", "dev", name},
		{"ip", "link", "set", "dev", name, "up"},
	}
	for _, route := range routes {
		cmds = append(cmds, []string{
			"ip", "route", "add", route, "dev", name,
		})
	}
	err := runCommands(cmds)
	if err != nil {
		return err
	}
	defer destroy()
	socksCmd := exec.CommandContext(ctx, "tun2socks", "-device", name, "-proxy", "socks5://127.0.0.1:1080")
	return socksCmd.Run()
}

func destroy() error {
	name := resolveInterface()
	return runCommands([][]string{
		{"ip", "link", "set", "dev", name, "down"},
		{"ip", "tuntap", "del", "dev", name, "mode", "tun"},
	})
}

func resolveInterface() string {
	return "sst"
}
