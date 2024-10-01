package tunnel

import (
	"fmt"
	"os/exec"
	"runtime"
)

func CreateInterface(routes ...string) error {
	DestroyInterface()
	cmds := [][]string{}
	name := resolveInterface()
	switch runtime.GOOS {
	case "linux":
		cmds = [][]string{
			{"ip", "tuntap", "add", name, "mode", "tun"},
			{"ip", "addr", "add", "172.16.0.1/12", "dev", name},
			{"ip", "link", "set", "dev", name, "up"},
		}
		for _, route := range routes {
			cmds = append(cmds, []string{
				"ip", "route", "add", route, "dev", name,
			})
		}
	case "darwin":
		cmds := [][]string{
			{"ifconfig", name, "create"},
			{"ifconfig", name, "172.16.0.1", "172.16.0.1", "netmask", "255.240.0.0", "up"},
			{"route", "add", "-net", "10.0.4.0/22", "-interface", name},
		}
		for _, route := range routes {
			cmds = append(cmds, []string{
				"route", "add", "-net", route, "-interface", name,
			})
		}
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
	return runCommands(cmds)
}

func DestroyInterface() error {
	name := resolveInterface()
	switch runtime.GOOS {
	case "linux":
		return runCommands([][]string{
			{"ip", "link", "set", "dev", name, "down"},
			{"ip", "tuntap", "del", "dev", name, "mode", "tun"},
		})
	case "darwin":
		return runCommands([][]string{
			{"ifconfig", name, "down"},
			{"ifconfig", name, "destroy"},
		})
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

func resolveInterface() string {
	if runtime.GOOS == "darwin" {
		return "utun69"
	}
	return "sst"
}

func runCommands(cmds [][]string) error {
	for _, item := range cmds {
		cmd := exec.Command(item[0], item[1:]...)
		err := cmd.Run()
		if err != nil {
			return fmt.Errorf("failed to execute command '%v': %v", item, err)
		}
	}
	return nil
}
