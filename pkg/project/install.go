package project

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/sst/ion/pkg/global"
)

func getProviderPackage(name string) string {
	if strings.Contains(name, "/") {
		return name
	}
	return "@pulumi/" + name
}

func cleanProviderName(name string) string {
	result := regexp.MustCompile("[^a-zA-Z0-9]+").ReplaceAllString(name, "")
	result = strings.ReplaceAll(result, "pulumi", "")
	return result
}

func (p *Project) NeedsInstall() bool {
	platformDir := p.PathPlatformDir()
	for name := range p.app.Providers {
		pkg := getProviderPackage(name)
		if _, err := os.Stat(filepath.Join(platformDir, "node_modules", pkg)); err != nil {
			return true
		}
	}
	return false
}

func (p *Project) Install() error {
	slog.Info("installing deps")
	err := p.writePackageJson()
	if err != nil {
		return err
	}

	err = p.fetchDeps()
	if err != nil {
		return err
	}

	err = p.writeTypes()
	if err != nil {
		return err
	}

	return nil
}

func (p *Project) writePackageJson() error {
	slog.Info("writing package.json")
	packageJsonPath := filepath.Join(p.PathPlatformDir(), "package.json")
	packageJson, err := os.OpenFile(packageJsonPath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return err
	}
	defer packageJson.Close()

	var data []byte
	data, err = io.ReadAll(packageJson)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return err
	}

	dependencies := result["dependencies"].(map[string]interface{})
	for name, config := range p.app.Providers {
		version := config.(map[string]interface{})["version"]
		if version == nil || version == "" {
			version = "latest"
		}
		slog.Info("adding dependency", "name", name)
		dependencies[getProviderPackage(name)] = version
	}

	dataToWrite, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}

	if err := packageJson.Truncate(0); err != nil {
		return err
	}

	if _, err := packageJson.Seek(0, 0); err != nil {
		return err
	}

	if _, err := packageJson.Write(dataToWrite); err != nil {
		return err
	}
	return nil
}

func (p *Project) writeTypes() error {
	slog.Info("writing types")
	typesPath := filepath.Join(p.PathPlatformDir(), "config.d.ts")
	file, err := os.OpenFile(typesPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	file.WriteString(`import "./src/global.d.ts"` + "\n")
	file.WriteString(`import { AppInput, App, Config } from "./src/config"` + "\n")

	for raw := range p.app.Providers {
		name := cleanProviderName(raw)
		pkg := getProviderPackage(raw)
		file.WriteString(`import * as _` + name + ` from "` + pkg + `";` + "\n")
	}

	file.WriteString("\n\n")

	file.WriteString(`declare global {` + "\n")
	for raw := range p.app.Providers {
		name := cleanProviderName(raw)
		file.WriteString(`  // @ts-expect-error` + "\n")
		file.WriteString(`  export import ` + name + ` = _` + name + "\n")
	}
	file.WriteString(`  interface Providers {` + "\n")
	file.WriteString(`    providers?: {` + "\n")
	for raw := range p.app.Providers {
		name := cleanProviderName(raw)
		file.WriteString(`      "` + raw + `"?:  (_` + name + `.ProviderArgs & { version?: string }) | boolean;` + "\n")
	}
	file.WriteString(`    }` + "\n")
	file.WriteString(`  }` + "\n")
	file.WriteString(`  export const $config: (` + "\n")
	file.WriteString(`    input: Omit<Config, "app"> & {` + "\n")
	file.WriteString(`      app(input: AppInput): Omit<App, "providers"> & Providers;` + "\n")
	file.WriteString(`    },` + "\n")
	file.WriteString(`  ) => Config;` + "\n")
	file.WriteString(`}` + "\n")

	return nil
}

func (p *Project) fetchDeps() error {
	slog.Info("fetching deps")
	manager := global.BunPath()
	if os.Getenv("NO_BUN") != "" {
		manager = "npm"
	}
	cmd := exec.Command(manager, "install")
	cmd.Dir = p.PathPlatformDir()
	output, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New("failed to run bun install " + string(output))
	}
	return nil
}
