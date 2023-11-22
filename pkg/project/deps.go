package project

import (
	"embed"
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
)

//go:embed components/src/* components/package.json
var sstFiles embed.FS

var VERSIONS = [][]string{
	{"sst-ion", "0.0.2"},
	{"@pulumi/aws", "~"},
	{"@pulumi/pulumi", "~"},
}

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

	err := copyEmbeddedFiles("components", p.PathTemp())
	if err != nil {
		return err
	}

	if p.version != "dev" {
		slog.Info("removing node_modules")
		os.RemoveAll(filepath.Join(p.PathTemp(), "node_modules"))
	}

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

func copyEmbeddedFiles(srcDir, destDir string) error {
	// Create the destination directory if it doesn't exist
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	// List all files and directories in the embedded FS
	entries, err := sstFiles.ReadDir(srcDir)
	if err != nil {
		return err
	}

	// Loop through each entry (file or directory)
	for _, entry := range entries {
		srcPath := filepath.Join(srcDir, entry.Name())
		destPath := filepath.Join(destDir, entry.Name())

		if entry.IsDir() {
			// If it's a directory, recursively copy its contents
			if err := copyEmbeddedFiles(srcPath, destPath); err != nil {
				return err
			}
		} else {
			// If it's a file, copy it to the destination directory
			srcFile, err := sstFiles.Open(srcPath)
			if err != nil {
				return err
			}
			defer srcFile.Close()

			destFile, err := os.Create(destPath)
			if err != nil {
				return err
			}
			defer destFile.Close()

			if _, err := io.Copy(destFile, srcFile); err != nil {
				return err
			}
		}
	}

	return nil
}
