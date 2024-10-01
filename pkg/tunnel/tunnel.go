package tunnel

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"

	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/internal/util"
)

var permissionedBinary = "/opt/sst/sst"

func Install() error {
	currentUser, err := user.Current()
	if err != nil {
		return err
	}
	sourcePath, err := os.Executable()
	if err != nil {
		return err
	}
	os.MkdirAll(filepath.Dir(permissionedBinary), 0755)
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer sourceFile.Close()
	destFile, err := os.Create(permissionedBinary)
	if err != nil {
		return err
	}
	defer destFile.Close()
	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return err
	}
	err = os.Chmod(permissionedBinary, 0755)
	sudoersPath := "/etc/sudoers.d/sst"
	command := permissionedBinary + " tunnel start"
	sudoersEntry := fmt.Sprintf("%s ALL=(ALL) NOPASSWD: %s\n", currentUser.Username, command)
	err = os.WriteFile(sudoersPath, []byte(sudoersEntry), 0440)
	if err != nil {
		return err
	}
	var cmd *exec.Cmd
	if runtime.GOOS == "darwin" {
		cmd = exec.Command("visudo", "-cf", sudoersPath)
	} else {
		cmd = exec.Command("visudo", "-c", "-f", sudoersPath)
	}
	err = cmd.Run()
	if err != nil {
		os.Remove(sudoersPath)
		return util.NewReadableError(err, "Error validating sudoers file")
	}

	ui.Success("Sudoers entry added successfully.")
	return nil
}
