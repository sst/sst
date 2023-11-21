package project

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var VERSIONS = [][]string{
	{"sst-ion", "0.0.2"},
	{"@pulumi/aws", "~"},
	{"@pulumi/pulumi", "~"},
}

func (p *Project) CheckDeps() bool {
	versionHints := map[string]string{}
	for _, item := range VERSIONS {
		pkg := item[0]
		version := item[1]
		slog.Info("checking", "dep", pkg)

		if version == "~" {
			version = versionHints[pkg]
		}
		if version == "" {
			slog.Info("no version for", "dep", pkg)
			return false
		}
		parsed, err := getPackageJson(p, pkg)
		if err != nil {
			slog.Info("error getting package.json for", "dep", pkg, "error", err)
			return false
		}

		slog.Info("checking", "dep", pkg, "version", parsed.Version, "expected", version)
		if !strings.HasSuffix(parsed.Version, version) {
			return false
		}

		if pkg == "sst-ion" {
			versionHints = parsed.Dependencies
		}
	}

	return true
}

func (p *Project) InstallDeps() error {
	err := os.WriteFile(
		filepath.Join(
			p.PathTemp(),
			"package.json",
		),
		[]byte(`{}`),
		0644,
	)
	if err != nil {
		return err
	}

	versionHints := map[string]string{}
	for _, item := range VERSIONS {
		pkg := item[0]
		version := item[1]
		slog.Info("installing", "dep", pkg, "to", p.PathTemp())

		if version == "~" {
			slog.Info("using version hint", "hints", versionHints[pkg])
			version = versionHints[pkg]
		}
		if version == "" {
			return fmt.Errorf("no version for %s", pkg)
		}

		cmd := exec.Command("npm", "install", "--save", pkg+"@"+version)
		cmd.Dir = p.PathTemp()
		cmd.Stderr = os.Stderr
		cmd.Stdout = os.Stdout
		err := cmd.Run()
		if err != nil {
			return err
		}

		if pkg == "sst-ion" {
			pkg, err := getPackageJson(p, pkg)
			if err != nil {
				return err
			}
			versionHints = pkg.Dependencies
		}
	}
	return nil
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
