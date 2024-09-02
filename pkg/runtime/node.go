package runtime

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sst/ion/internal/fs"
	"github.com/sst/ion/internal/util"
)

type NodeRuntime struct {
	contexts map[string]esbuild.BuildContext
	results  map[string]esbuild.BuildResult
	workers  map[string]*NodeWorker
	loop     *NodeLoop
}

type NodeLoop struct {
	stdout io.ReadCloser
	stderr io.ReadCloser
	stdin  io.WriteCloser
	cmd    *exec.Cmd
}

func newNodeRuntime() *NodeRuntime {
	return &NodeRuntime{
		contexts: map[string]esbuild.BuildContext{},
		results:  map[string]esbuild.BuildResult{},
		workers:  map[string]*NodeWorker{},
	}
}

type NodeWorker struct {
	workerID string
	out      io.ReadCloser
	in       io.WriteCloser
	loop     *NodeLoop
}

func (w *NodeWorker) Stop() {
	json.NewEncoder(w.loop.stdin).Encode(map[string]interface{}{
		"type":     "worker.stop",
		"workerID": w.workerID,
	})
}

func (w *NodeWorker) Logs() io.ReadCloser {
	return w.out
}

type NodeProperties struct {
	Loader    map[string]string `json:"loader"`
	Install   []string
	Banner    string
	ESBuild   esbuild.BuildOptions `json:"esbuild"`
	Minify    bool                 `json:"minify"`
	Format    string               `json:"format"`
	SourceMap bool                 `json:"sourceMap"`
	Splitting bool                 `json:"splitting"`
}

var NODE_EXTENSIONS = []string{".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"}

func (r *NodeRuntime) Build(ctx context.Context, input *BuildInput) (*BuildOutput, error) {
	var properties NodeProperties
	json.Unmarshal(input.Warp.Properties, &properties)

	file, ok := r.getFile(input)
	if !ok {
		return nil, fmt.Errorf("Handler not found: %v", input.Warp.Handler)
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
		return nil, err
	}
	target := filepath.Join(input.Out(), strings.ReplaceAll(rel, filepath.Ext(rel), extension))

	slog.Info("loader info", "loader", properties.Loader)

	loader := map[string]esbuild.Loader{}
	loaderMap := map[string]api.Loader{
		"js":      api.LoaderJS,
		"jsx":     api.LoaderJSX,
		"ts":      api.LoaderTS,
		"tsx":     api.LoaderTSX,
		"css":     api.LoaderCSS,
		"json":    api.LoaderJSON,
		"text":    api.LoaderText,
		"base64":  api.LoaderBase64,
		"file":    api.LoaderFile,
		"dataurl": api.LoaderDataURL,
		"binary":  api.LoaderBinary,
	}

	for key, value := range properties.Loader {
		mapped, ok := loaderMap[value]
		if !ok {
			continue
		}
		loader[key] = mapped
	}

	options := esbuild.BuildOptions{
		EntryPoints: []string{file},
		Platform:    esbuild.PlatformNode,
		External: append(
			[]string{
				"sharp", "pg-native",
			},
			properties.Install...,
		),
		Sourcemap:         esbuild.SourceMapLinked,
		Loader:            loader,
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
				`const __filename = topLevelFileUrlToPath(import.meta.url)`,
				`const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
				properties.Banner,
			}, "\n"),
		}
	} else {
		options.Format = esbuild.FormatCommonJS
		options.Target = esbuild.ESNext
	}

	if properties.ESBuild.Target != 0 {
		options.Target = properties.ESBuild.Target
	}

	buildContext, ok := r.contexts[input.Warp.FunctionID]
	if !ok {
		buildContext, _ = esbuild.Context(options)
		r.contexts[input.Warp.FunctionID] = buildContext
	}

	result := buildContext.Rebuild()
	r.results[input.Warp.FunctionID] = result
	errors := []string{}
	for _, error := range result.Errors {
		errors = append(errors, error.Text+" "+error.Location.File+":"+fmt.Sprint(error.Location.Line)+":"+fmt.Sprint(error.Location.Column))
	}
	for _, error := range result.Errors {
		slog.Error("esbuild error", "error", error)
	}
	for _, warning := range result.Warnings {
		slog.Error("esbuild error", "error", warning)
	}

	nodeModules, err := fs.FindUp(file, "node_modules")
	if err == nil {
		os.Symlink(nodeModules, filepath.Join(input.Out(), "node_modules"))
	}

	return &BuildOutput{
		Handler: input.Warp.Handler,
		Errors:  errors,
	}, nil
}

func (r *NodeRuntime) Run(ctx context.Context, input *RunInput) (Worker, error) {
	if r.loop == nil {
		cmd := exec.CommandContext(
			ctx,
			"node",
			"--inspect",
			"--enable-source-maps",
			filepath.Join(
				input.Project.PathPlatformDir(),
				"/dist/nodejs-runtime/loop.js",
			),
		)
		util.SetProcessGroupID(cmd)
		cmd.Cancel = func() error {
			return util.TerminateProcess(cmd.Process.Pid)
		}
		stdin, _ := cmd.StdinPipe()
		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()
		r.loop = &NodeLoop{
			stdout: stdout,
			stderr: stderr,
			stdin:  stdin,
			cmd:    cmd,
		}
		err := cmd.Start()
		if err != nil {
			return nil, err
		}
		go func() {
			decoder := json.NewDecoder(r.loop.stdout)
			for {
				var msg map[string]interface{}
				err := decoder.Decode(&msg)
				if err != nil {
					if err == io.EOF {
						return
					}
					slog.Error("node loop error", "err", err)
					continue
				}

				switch msg["type"] {
				case "worker.out":
					w := r.workers[msg["workerID"].(string)]
					if w != nil {
						w.in.Write([]byte(msg["data"].(string)))
					}
				case "worker.exit":
					w := r.workers[msg["workerID"].(string)]
					if w != nil {
						w.in.Close()
					}
				}
			}
		}()
	}
	env := map[string]string{}
	for _, value := range input.Env {
		pair := strings.SplitN(value, "=", 2)
		if len(pair) == 2 {
			env[pair[0]] = pair[1]
		}
	}
	env["AWS_LAMBDA_RUNTIME_API"] = input.Server
	json.NewEncoder(r.loop.stdin).Encode(map[string]interface{}{
		"type":     "worker.start",
		"workerID": input.WorkerID,
		"env":      env,
		"args":     []string{filepath.Join(input.Build.Out, input.Build.Handler), input.WorkerID},
	})
	out, in := io.Pipe()
	w := &NodeWorker{
		loop:     r.loop,
		workerID: input.WorkerID,
		out:      out,
		in:       in,
	}
	r.workers[input.WorkerID] = w
	return w, nil
}

func (r *NodeRuntime) Match(runtime string) bool {
	return strings.HasPrefix(runtime, "node")
}

func (r *NodeRuntime) getFile(input *BuildInput) (string, bool) {
	dir := filepath.Dir(input.Warp.Handler)
	fileSplit := strings.Split(filepath.Base(input.Warp.Handler), ".")
	base := strings.Join(fileSplit[:len(fileSplit)-1], ".")
	for _, ext := range NODE_EXTENSIONS {
		file := filepath.Join(input.Project.PathRoot(), dir, base+ext)
		if _, err := os.Stat(file); err == nil {
			return file, true
		}
	}
	return "", false
}

func (r *NodeRuntime) ShouldRebuild(functionID string, file string) bool {
	result, ok := r.results[functionID]
	if !ok {
		return false
	}

	var meta = map[string]interface{}{}
	err := json.Unmarshal([]byte(result.Metafile), &meta)
	if err != nil {
		return false
	}
	for key := range meta["inputs"].(map[string]interface{}) {
		absPath, err := filepath.Abs(key)
		if err != nil {
			continue
		}
		if absPath == file {
			return true
		}
	}

	return false
}
