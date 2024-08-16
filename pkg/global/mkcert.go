package global

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
)

const MKCERT_VERSION = "1.4.4"

func EnsureMkcert() error {
	binPath := filepath.Join(BinPath(), "mkcert")
	if _, err := os.Stat(binPath); err == nil {
		return nil
	}
	slog.Info("mkcert install")
	var osArch string
	switch runtime.GOOS {
	case "darwin":
		osArch = "darwin"
	case "linux":
		osArch = "linux"
	case "windows":
		osArch = "windows"
	default:
		return fmt.Errorf("unsupported operating system")
	}
	switch runtime.GOARCH {
	case "amd64":
		osArch += "-amd64"
	case "arm64":
		osArch += "-arm64"
	default:
		return fmt.Errorf("unsupported architecture")
	}

	fileExtension := ""
	if runtime.GOOS == "windows" {
		fileExtension = ".exe"
	}

	url := fmt.Sprintf("https://github.com/FiloSottile/mkcert/releases/download/v%v/mkcert-v%v-%s%s", MKCERT_VERSION, MKCERT_VERSION, osArch, fileExtension)
	slog.Info("mkcert downloading", "url", url)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download mkcert: HTTP status %d", resp.StatusCode)
	}
	// write to binPath
	file, err := os.Create(binPath)
	if err != nil {
		return err
	}
	defer file.Close()
	io.Copy(file, resp.Body)
	err = os.Chmod(binPath, 0755)
	if err != nil {
		return err
	}
	return nil
}
