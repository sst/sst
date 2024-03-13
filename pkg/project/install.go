package project

import (
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
)

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
		dependencies["@pulumi/"+name] = version
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

	for name := range p.app.Providers {
		file.WriteString(`import _` + name + `, { ProviderArgs as _` + name + `Args } from "@pulumi/` + name + `";` + "\n")
	}

	file.WriteString("\n\n")

	file.WriteString(`declare global {` + "\n")
	for name := range p.app.Providers {
		file.WriteString(`  // @ts-expect-error` + "\n")
		file.WriteString(`  export import ` + name + ` = _` + name + "\n")
	}
	file.WriteString(`  interface Providers {` + "\n")
	file.WriteString(`    providers: {` + "\n")
	for name := range p.app.Providers {
		file.WriteString(`      ` + name + `?:  (_` + name + `Args & { version?: string }) | boolean;` + "\n")
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
	cmd := exec.Command("bun", "install")
	cmd.Dir = p.PathPlatformDir()

	err := cmd.Run()
	if err != nil {
		return err
	}
	return nil
}
