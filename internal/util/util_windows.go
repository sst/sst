package util

import (
	"os"
	"os/exec"
	"syscall"
)

// https://github.com/go-cmd/cmd/blob/master/cmd_windows.go
func TerminateProcess(pid int) error {
	p, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	return p.Kill()
}

// https://github.com/go-cmd/cmd/blob/master/cmd_windows.go
func SetProcessGroupID(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{}
}
