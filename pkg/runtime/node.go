package runtime

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

type NodeRuntime struct {
}

type NodeProperties struct {
	Loader    map[string]esbuild.Loader `json:"loader"`
	Install   []string
	Banner    string
	ESBuild   esbuild.BuildOptions `json:"esbuild"`
	Minify    bool                 `json:"minify"`
	Format    string               `json:"format"`
	SourceMap bool                 `json:"sourceMap"`
	Splitting bool                 `json:"splitting"`
}

var NODE_EXTENSIONS = []string{".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"}

func (r *NodeRuntime) Build(ctx context.Context, input *BuildInput) error {
	var properties NodeProperties
	err := json.Unmarshal(input.Properties, &properties)
	if err != nil {
		return err
	}

	file, ok := r.getFile(input)
	if !ok {
		return fmt.Errorf("Handler not found: %v", input.Handler)
	}
	filepath.Rel(input.Project.PathRoot(), file)

	isESM := true
	extension := ".mjs"

	if properties.Format == "cjs" {
		isESM = false
		extension = ".cjs"
	}

	rel, err := filepath.Rel(input.Project.PathRoot(), file)
	if err != nil {
		return err
	}
	target := filepath.Join(input.Out(), strings.ReplaceAll(rel, filepath.Ext(rel), extension))
	slog.Info("building", "from", file, "to", target)

	options := esbuild.BuildOptions{
		EntryPoints: []string{file},
		Platform:    esbuild.PlatformNode,
		External: append(
			[]string{
				"sharp", "pg-native",
			},
			properties.Install...,
		),
		Loader:            properties.Loader,
		KeepNames:         true,
		Bundle:            true,
		Splitting:         properties.Splitting,
		Metafile:          true,
		Write:             true,
		Outfile:           target,
		MinifyWhitespace:  properties.Minify,
		MinifySyntax:      properties.Minify,
		MinifyIdentifiers: properties.Minify,
	}

	if isESM {
		options.Format = esbuild.FormatESModule
		options.Target = esbuild.ESNext
		options.MainFields = []string{"module", "main"}
		options.Banner = map[string]string{
			"js": strings.Join([]string{
				`import { createRequire as topLevelCreateRequire } from 'module';`,
				`const require = topLevelCreateRequire(import.meta.url);`,
				`import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
				`const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
				properties.Banner,
			}, "\n"),
		}
	} else {
		options.Format = esbuild.FormatCommonJS
		options.Target = esbuild.ESNext
	}
	result := esbuild.Build(options)
	for _, error := range result.Errors {
		slog.Error("esbuild error", "error", error)
	}
	for _, warning := range result.Warnings {
		slog.Error("esbuild error", "error", warning)
	}
	return nil
}

func (r *NodeRuntime) Run(ctx context.Context, input *RunInput) error {
	cmd := exec.CommandContext(ctx, "node", ".sst/platform/dist/nodejs-runtime/index.js", "src/index.handler")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "AWS_LAMBDA_RUNTIME_API=localhost:44149/lambda/"+input.WorkerID)
	return cmd.Run()
}

func (r *NodeRuntime) Match(runtime string) bool {
	return strings.HasPrefix(runtime, "node")
}

func (r *NodeRuntime) getFile(input *BuildInput) (string, bool) {
	dir := filepath.Dir(input.Handler)
	base := strings.Split(filepath.Base(input.Handler), ".")[0]
	for _, ext := range NODE_EXTENSIONS {
		file := filepath.Join(input.Project.PathRoot(), dir, base+ext)
		if _, err := os.Stat(file); err == nil {
			return file, true
		}
	}
	return "", false
}
