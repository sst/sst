package project

import (
	"encoding/json"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/sst/ion/internal/components"
)

func CheckDeps(version, cfgPath string) bool {
	if version == "dev" {
		return false
	}
	slog.Info("checking dependencies")
	contents, err := os.ReadFile(filepath.Join(resolveWorkDir(cfgPath), "version"))
	if err != nil {
		return false
	}
	return string(contents) == version
}

func InstallDeps(version, cfgPath string) error {
	slog.Info("installing dependencies")

	workingDir := resolveWorkDir(cfgPath)
	err := components.CopyTo(".", workingDir)
	if err != nil {
		return err
	}

	if version == "dev" {
		slog.Info("dev mode skipping node_module install")
		return nil
	}

	os.RemoveAll(filepath.Join(workingDir, "node_modules"))

	cmd := exec.Command("npm", "install")
	cmd.Dir = workingDir
	// cmd.Stderr = os.Stderr
	// cmd.Stdout = os.Stdout

	err = cmd.Run()
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(workingDir, "version"), []byte(version), 0644)
}

type PackageJson struct {
	Version      string            `json:"version"`
	Dependencies map[string]string `json:"dependencies"`
}

func getPackageJson(proj *Project, pkg string) (*PackageJson, error) {
	data, err := os.ReadFile(
		filepath.Join(
			proj.PathTemp(),
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
