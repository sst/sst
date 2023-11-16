package project

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
)

var VERSIONS = map[string]string{
	"@pulumi/pulumi": "3.93.0",
	"@pulumi/aws":    "v6.8.0",
}

func (p *Project) CheckDeps() map[string]bool {
	result := map[string]bool{}

	for k, v := range VERSIONS {
		slog.Info("checking", "dep", k)
		path := p.getPath("node_modules", k, "package.json")
		data, err := os.ReadFile(path)
		if err != nil {
			result[k] = true
		}

		parsed := struct {
			Version string `json:"version"`
		}{}
		err = json.Unmarshal(data, &parsed)
		if err != nil {
			result[k] = true
		}

		slog.Info("dep", "version", parsed.Version, "wanted", v)
		if parsed.Version != v {
			result[k] = true
		}
	}

	return result
}

func (p *Project) InstallDeps(input map[string]bool) error {
	for k := range input {
		slog.Info("installing", "dep", k, "to", p.PathTemp())
		cmd := exec.Command("npm", "install", "--save", k+"@"+VERSIONS[k])
		cmd.Dir = p.PathTemp()
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Print(string(output))
			return err
		}
	}
	return nil
}
