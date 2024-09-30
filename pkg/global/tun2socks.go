package global

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
)

const TUN2SOCKS_VERSION = "2.5.2"

func EnsureTun2Socks() error {
	binPath := filepath.Join(BinPath(), "tun2socks")
	if _, err := os.Stat(binPath); err == nil {
		return nil
	}
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

	url := fmt.Sprintf("https://github.com/xjasonlyu/tun2socks/releases/download/v%v/tun2socks-%s.zip", TUN2SOCKS_VERSION, osArch)
	slog.Info("tun2socks downloading", "url", url)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download tun2socks: HTTP status %d", resp.StatusCode)
	}
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	readerAt := bytes.NewReader(bodyBytes)
	zipReader, err := zip.NewReader(readerAt, readerAt.Size())
	if err != nil {
		return err
	}
	f, err := zipReader.File[0].Open()
	if err != nil {
		return err
	}
	defer f.Close()

	tmpFile := filepath.Join(BinPath(), "sst-tun2socks-download")
	outFile, err := os.Create(tmpFile)
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, f)
	if err != nil {
		return err
	}
	outFile.Close()

	err = os.Rename(tmpFile, binPath)
	if err != nil {
		return err
	}
	err = os.Chmod(binPath, 0755)
	if err != nil {
		return err
	}
	return nil
}
