package global

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/pulumi/pulumi/sdk/v3"
)

var PULUMI_VERSION = "v" + sdk.Version.String()

const BUN_VERSION = "1.1.24"

const UV_VERSION = "0.3.2"

var configDir = (func() string {
	home, err := os.UserConfigDir()
	if err != nil {
		panic(err)
	}
	result := filepath.Join(home, "sst")
	os.Setenv("PATH", result+"/bin:"+os.Getenv("PATH"))
	os.MkdirAll(result, 0755)
	os.MkdirAll(filepath.Join(result, "bin"), 0755)
	return result
}())

func ConfigDir() string {
	return configDir
}

func NeedsPulumi() bool {
	path := PulumiPath()
	slog.Info("checking for pulumi", "path", path)
	if _, err := os.Stat(path); err != nil {
		return true
	}
	cmd := exec.Command(path, "version")
	output, err := cmd.Output()
	if err != nil {
		return true
	}

	version := strings.TrimSpace(string(output))
	return version != PULUMI_VERSION
}

func InstallPulumi() error {
	slog.Info("pulumi install")
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
		osArch += "-x64"
	case "arm64":
		osArch += "-arm64"
	default:
		return fmt.Errorf("unsupported architecture")
	}

	fileExtension := ".tar.gz"
	if runtime.GOOS == "windows" {
		fileExtension = ".zip"
	}

	url := fmt.Sprintf("https://github.com/pulumi/pulumi/releases/download/%v/pulumi-%s-%s%s", PULUMI_VERSION, PULUMI_VERSION, osArch, fileExtension)
	slog.Info("pulumi downloading", "url", url)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download pulumi: HTTP status %d", resp.StatusCode)
	}

	switch fileExtension {
	case ".tar.gz":
		gzr, err := gzip.NewReader(resp.Body)
		if err != nil {
			return err
		}
		defer gzr.Close()
		err = untar(gzr, BinPath())
		if err != nil {
			return err
		}

	default:
		panic("cannot extract zip file for pulumi")
	}

	return nil
}

func PulumiPath() string {
	return filepath.Join(BinPath(), "pulumi")
}

func BunPath() string {
	return filepath.Join(BinPath(), "bun")
}

func UvPath() string {
	return filepath.Join(BinPath(), "uv")
}

func BinPath() string {
	return filepath.Join(configDir, "bin")
}

func CertPath() string {
	return filepath.Join(configDir, "cert")
}

func NeedsUv() bool {
	path := UvPath()
	slog.Info("checking for uv", "path", path)
	if _, err := os.Stat(path); err != nil {
		return true
	}
	cmd := exec.Command(path, "--version")
	output, err := cmd.Output()
	if err != nil {
		return true
	}
	version := strings.Fields(strings.TrimSpace(string(output)))[1]
	return version != UV_VERSION
}

func InstallUv() error {
	slog.Info("uv install")
	goos := runtime.GOOS
	arch := runtime.GOARCH
	uvPath := UvPath()

	var filename string
	switch {
	case goos == "darwin" && arch == "arm64":
		filename = "uv-aarch64-apple-darwin.tar.gz"
	case goos == "darwin" && arch == "amd64":
		filename = "uv-x86_64-apple-darwin.tar.gz"
	case goos == "linux" && arch == "arm64":
		filename = "uv-aarch64-unknown-linux-gnu.tar.gz"
	case goos == "linux" && arch == "amd64":
		filename = "uv-x86_64-unknown-linux-gnu.tar.gz"
	default:
	}
	if filename == "" {
		return fmt.Errorf("unsupported platform: %s %s", goos, arch)
	}

	url := "https://github.com/astral-sh/uv/releases/download/" + UV_VERSION + "/" + filename
	slog.Info("uv downloading", "url", url)
	response, err := http.Get(url)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", response.Status)
	}

	// Read the entire response body into memory
	bodyBytes, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	// use a buffer to extract the tar.gz file
	gzipReader, err := gzip.NewReader(bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("untar: Next() failed: %v", err)
		}

		// Check if the current file is the `uv` binary
		if filepath.Base(header.Name) == "uv" {
			tmpFile := filepath.Join(BinPath(), "sst-uv-download")
			outFile, err := os.Create(tmpFile)
			if err != nil {
				return err
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, tarReader); err != nil {
				return err
			}

			outFile.Close()

			err = os.Rename(tmpFile, uvPath)
			if err != nil {
				return err
			}

			err = os.Chmod(uvPath, 0755)
			if err != nil {
				return err
			}
			break
		}
	}

	return nil
}

func NeedsBun() bool {
	path := BunPath()
	slog.Info("checking for bun", "path", path)
	if _, err := os.Stat(path); err != nil {
		return true
	}
	cmd := exec.Command(path, "--version")
	output, err := cmd.Output()
	if err != nil {
		return true
	}
	version := strings.TrimSpace(string(output))
	return version != BUN_VERSION
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
		filename = "bun-darwin-x64-baseline.zip"
	case goos == "linux" && arch == "arm64":
		filename = "bun-linux-aarch64.zip"
	case goos == "linux" && arch == "amd64":
		filename = "bun-linux-x64-baseline.zip"
	default:
	}
	if filename == "" {
		return fmt.Errorf("unsupported platform: %s %s", goos, arch)
	}

	url := "https://github.com/oven-sh/bun/releases//download/bun-v" + BUN_VERSION + "/" + filename
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

			tmpFile := filepath.Join(BinPath(), "sst-bun-download")
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

			err = os.Rename(tmpFile, bunPath)
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
