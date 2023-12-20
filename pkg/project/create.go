package project

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"

	jsonpatch "github.com/evanphx/json-patch/v5"

	"github.com/sst/ion/internal/components"
)

type step struct {
	Type       string          `json:"type"`
	Properties json.RawMessage `json:"properties"`
}

type copyStep struct {
}

type patchStep struct {
	Patch jsonpatch.Patch `json:"patch"`
	File  string          `json:"file"`
}

type preset struct {
	Steps []step `json:"steps"`
}

func Create(templateName string) error {
	if _, err := os.Stat("sst.config.ts"); err == nil {
		return fmt.Errorf("sst.config.ts already exists")
	}

	currentDirectory, err := os.Getwd()
	if err != nil {
		return nil
	}
	directoryName := strings.ToLower(filepath.Base(currentDirectory))
	slog.Info("creating project", "name", directoryName)

	presetBytes, err := components.Templates.ReadFile(filepath.Join("templates", templateName, "preset.json"))
	if err != nil {
		return err
	}
	var preset preset
	err = json.Unmarshal(presetBytes, &preset)
	if err != nil {
		return err
	}

	for _, step := range preset.Steps {
		switch step.Type {
		case "patch":
			var patchStep patchStep
			err = json.Unmarshal(step.Properties, &patchStep)
			if err != nil {
				return err
			}
			data, err := os.ReadFile(patchStep.File)
			if err != nil {
				return err
			}
			final, err := patchStep.Patch.ApplyWithOptions(data, &jsonpatch.ApplyOptions{
				SupportNegativeIndices: false,
				EnsurePathExistsOnAdd:  true,
			})
			if err != nil {
				return err
			}

			var formatted bytes.Buffer
			err = json.Indent(&formatted, final, "", "  ")
			if err != nil {
				return err
			}

			file, err := os.Create(patchStep.File)
			if err != nil {
				return err
			}
			defer file.Close()

			_, err = formatted.WriteTo(file)
			if err != nil {
				return err
			}
			exec.Command("npx", "prettier", "--write", patchStep.File).Start()
			break

		case "copy":
			err = fs.WalkDir(components.Templates, filepath.Join("templates", templateName, "files"), func(path string, d fs.DirEntry, err error) error {
				if d.IsDir() {
					return nil
				}

				src, err := components.Templates.ReadFile(path)
				if err != nil {
					return err
				}

				name := d.Name()

				slog.Info("copying template", "path", path)
				tmpl, err := template.New(path).Parse(string(src))
				data := struct {
					App string
				}{
					App: directoryName,
				}

				output, err := os.Create(name)
				if err != nil {
					return err
				}
				defer output.Close()

				err = tmpl.Execute(output, data)
				if err != nil {
					return err
				}

				return nil
			})
			if err != nil {
				return err
			}
		}
	}

	return nil
}
