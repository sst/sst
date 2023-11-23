package project

import (
	"encoding/json"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/sst/ion/internal/components"
)

func (p *Project) CheckDeps() bool {
	if p.version == "dev" {
		return false
	}

	slog.Info("checking dependencies")
	contents, err := os.ReadFile(filepath.Join(p.PathTemp(), "version"))
	if err != nil {
		return false
	}

	return string(contents) == p.version
}

func (p *Project) InstallDeps() error {
	slog.Info("installing dependencies")

	err := components.CopyTo(".", p.PathTemp())
	if err != nil {
		return err
	}

	if p.version == "dev" {
		slog.Info("dev mode skipping node_module install")
		return nil
	}

	os.RemoveAll(filepath.Join(p.PathTemp(), "node_modules"))

	cmd := exec.Command("npm", "install")
	cmd.Dir = p.PathTemp()
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout

	err = cmd.Run()
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(p.PathTemp(), "version"), []byte(p.version), 0644)
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
