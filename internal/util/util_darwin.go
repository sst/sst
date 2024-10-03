package util

import (
	"os/exec"
	"syscall"
)

// https://github.com/go-cmd/cmd/blob/master/cmd_darwin.go
func TerminateProcess(pid int) error {
	// Signal the process group (-pid), not just the process, so that the process
	// and all its children are signaled. Else, child procs can keep running and
	// keep the stdout/stderr fd open and cause cmd.Wait to hang.
	return syscall.Kill(-pid, syscall.SIGTERM)
}

// https://github.com/go-cmd/cmd/blob/master/cmd_darwin.go
func SetProcessGroupID(cmd *exec.Cmd) {
	// Set process group ID so the cmd and all its children become a new
	// process group. This allows Stop to SIGTERM the cmd's process group
	// without killing this process (i.e. this code here).
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

func SetProcessCancel(cmd *exec.Cmd) {
	cmd.Cancel = func() error {
		return TerminateProcess(cmd.Process.Pid)
	}
}
