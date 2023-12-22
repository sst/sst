package global

import (
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

var configDir = (func() string {
	home, err := os.UserConfigDir()
	if err != nil {
		panic(err)
	}
	return filepath.Join(home, "sst")
}())

func ConfigDir() string {
	return configDir
}

func NeedsPlugins() bool {
	files, err := os.ReadDir(filepath.Join(configDir, "plugins"))
	if err != nil {
		return true
	}
	slog.Info("plugins", "files", files)

	if len(files) == 0 {
		return true
	}

	return false
}

func InstallPlugins() error {
	slog.Info("installing plugins")
	cmd := exec.Command("pulumi", "plugin", "install", "resource", "aws")
	cmd.Env = append(os.Environ(), "PULUMI_HOME="+configDir)
	return cmd.Run()
}

func NeedsPulumi() bool {
	_, err := exec.LookPath("pulumi")
	if err != nil {
		return true
	}
	return false
}

func InstallPulumi() error {
	if runtime.GOOS == "windows" {
		psCommand := `"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1'))" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin"`
		_, err := exec.Command("cmd", "/C", psCommand).CombinedOutput()
		return err
	}

	cmd := `curl -fsSL https://get.pulumi.com | sh`
	_, err := exec.Command("bash", "-c", cmd).CombinedOutput()
	os.Setenv("PATH", os.Getenv("PATH")+":~/.pulumi/bin")
	return err
}
