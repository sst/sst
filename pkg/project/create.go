package project

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"

	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/sst/ion/pkg/platform"
	"github.com/tailscale/hujson"
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

type gitignoreStep struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type preset struct {
	Steps []step `json:"steps"`
}

var ErrConfigExists = fmt.Errorf("sst.config.ts already exists")

func Create(templateName string, home string) error {
	gitignoreSteps := []gitignoreStep{
		{
			Name: "# sst",
			Path: ".sst",
		},
	}

	if _, err := os.Stat("sst.config.ts"); err == nil {
		return ErrConfigExists
	}

	currentDirectory, err := os.Getwd()
	if err != nil {
		return nil
	}
	directoryName := strings.ToLower(filepath.Base(currentDirectory))
	slog.Info("creating project", "name", directoryName)

	presetBytes, err := platform.Templates.ReadFile(filepath.Join("templates", templateName, "preset.json"))
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
			slog.Info("patching", "file", patchStep.File)

			b, err := os.ReadFile(patchStep.File)
			if err != nil {
				return err
			}

			data, err := hujson.Standardize(b)
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
			templateFilesPath := filepath.Join("templates", templateName, "files")
			err = fs.WalkDir(platform.Templates, templateFilesPath, func(path string, d fs.DirEntry, err error) error {
				if d.IsDir() {
					// Create the directory if it doesn't exist
					dir := filepath.Join(".", strings.TrimPrefix(path, templateFilesPath))
					if dir == "" {
						return nil
					}
					err := os.MkdirAll(dir, 0755)
					if err != nil {
						return err
					}
					return nil
				}

				src, err := platform.Templates.ReadFile(path)
				if err != nil {
					return err
				}

				name := filepath.Join(".", strings.TrimPrefix(path, templateFilesPath))

				slog.Info("copying template", "path", path)
				tmpl, err := template.New(path).Parse(string(src))
				data := struct {
					App  string
					Home string
				}{
					App:  directoryName,
					Home: home,
				}

				if _, err := os.Stat(name); os.IsExist(err) {
					return nil
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
			break

		case "gitignore":
			var gitignoreStep gitignoreStep
			err = json.Unmarshal(step.Properties, &gitignoreStep)
			if err != nil {
				return err
			}
			slog.Info("handling .gitignore", "section", gitignoreStep.Name)
			gitignoreSteps = append(gitignoreSteps, gitignoreStep)
		}
	}

	// Update .gitignore
	gitignoreFilename := ".gitignore"
	file, err := os.OpenFile(gitignoreFilename, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		return err
	}
	defer file.Close()
	bytes, err := io.ReadAll(file)
	if err != nil {
		return err
	}
	content := string(bytes)

	for _, step := range gitignoreSteps {
		if !strings.Contains(content, step.Path) {
			if content != "" && !strings.HasSuffix(content, "\n") {
				file.WriteString("\n")
			}
			_, err := file.WriteString("\n" + step.Name + "\n" + step.Path + "\n")
			if err != nil {
				return err
			}
		}
	}

	return nil
}
