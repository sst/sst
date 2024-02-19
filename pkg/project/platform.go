package project

import (
	"encoding/json"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/sst/ion/pkg/platform"
)

func (p *Project) CheckPlatform(version string) bool {
	if version == "dev" {
		return false
	}
	slog.Info("checking platform")
	contents, err := os.ReadFile(filepath.Join(p.PathPlatformDir(), "version"))
	if err != nil {
		return false
	}
	return string(contents) == version
}

func (p *Project) InstallPlatform(version string) error {
	slog.Info("installing platform")
	platformDir := p.PathPlatformDir()
	os.RemoveAll(filepath.Join(platformDir))
	err := platform.CopyTo(".", platformDir)
	if err != nil {
		return err
	}
	if version == "dev" {
		return nil
	}
	cmd := exec.Command("bun", "install")
	cmd.Dir = platformDir
	err = cmd.Run()
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(platformDir, "version"), []byte(version), 0644)
}

type PackageJson struct {
	Version      string            `json:"version"`
	Dependencies map[string]string `json:"dependencies"`
}

func getPackageJson(proj *Project, pkg string) (*PackageJson, error) {
	data, err := os.ReadFile(
		filepath.Join(
			proj.PathWorkingDir(),
			"node_modules",
			pkg,
			"package.json",
		),
	)

	if err != nil {
		return nil, err
	}

	var parsed PackageJson
	err = json.Unmarshal(data, &parsed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
