package global

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"net/http"
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
	result := filepath.Join(home, "sst")
	os.Setenv("PATH", os.Getenv("PATH")+":"+result+"/bin")
	os.MkdirAll(result, 0755)
	os.MkdirAll(filepath.Join(result, "bin"), 0755)
	return result
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
	err := cmd.Run()
	if err != nil {
		return err
	}

	cmd = exec.Command("pulumi", "plugin", "install", "resource", "cloudflare")
	cmd.Env = append(os.Environ(), "PULUMI_HOME="+configDir)
	err = cmd.Run()
	if err != nil {
		return err
	}

	return nil
}

func NeedsPulumi() bool {
	home, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}
	os.Setenv("PATH", os.Getenv("PATH")+":"+home+"/.pulumi/bin")
	_, err = exec.LookPath("pulumi")
	if err != nil {
		return true
	}
	return false
}

func InstallPulumi() error {
	slog.Info("installing pulumi")
	if runtime.GOOS == "windows" {
		psCommand := `"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1'))" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin"`
		_, err := exec.Command("cmd", "/C", psCommand).CombinedOutput()
		return err
	}

	cmd := `curl -fsSL https://get.pulumi.com | sh`
	_, err := exec.Command("bash", "-c", cmd).CombinedOutput()
	return err
}

func BunPath() string {
	return filepath.Join(configDir, "bin", "bun")
}

func NeedsBun() bool {
	path := BunPath()
	slog.Info("checking for bun", "path", path)
	if _, err := os.Stat(path); err != nil {
		return true
	}
	return false
}

func InstallBun() error {
	slog.Info("bun install")
	goos := runtime.GOOS
	arch := runtime.GOARCH
	bunPath := BunPath()

	var filename string
	switch {
	case goos == "darwin" && arch == "arm64":
		filename = "bun-darwin-aarch64.zip"
	case goos == "darwin" && arch == "amd64":
		filename = "bun-darwin-x64.zip"
	case goos == "linux" && arch == "arm64":
		filename = "bun-linux-aarch64.zip"
	case goos == "linux" && arch == "amd64":
		filename = "bun-linux-x64.zip"
	default:
	}
	if filename == "" {
		return fmt.Errorf("unsupported platform: %s %s", goos, arch)
	}

	url := "https://github.com/oven-sh/bun/releases/latest/download/" + filename
	slog.Info("bun downloading", "url", url)
	response, err := http.Get(url)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", response.Status)
	}
	bodyBytes, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}
	readerAt := bytes.NewReader(bodyBytes)
	zipReader, err := zip.NewReader(readerAt, readerAt.Size())
	if err != nil {
		return err
	}
	for _, file := range zipReader.File {
		if filepath.Base(file.Name) == "bun" {
			f, err := file.Open()
			if err != nil {
				return err
			}
			defer f.Close()

			outFile, err := os.Create(bunPath)
			if err != nil {
				return err
			}
			defer outFile.Close()

			_, err = io.Copy(outFile, f)
			if err != nil {
				return err
			}

			err = os.Chmod(bunPath, 0755)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
