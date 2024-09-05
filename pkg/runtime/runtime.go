package runtime

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/sst/ion/pkg/project"
)

type Runtime interface {
	Match(runtime string) bool
	Build(ctx context.Context, input *BuildInput) (*BuildOutput, error)
	Run(ctx context.Context, input *RunInput) (Worker, error)
	ShouldRebuild(functionID string, path string) bool
}

type Worker interface {
	Stop()
	Logs() io.ReadCloser
}

type BuildInput struct {
	Warp    project.Warp
	Project *project.Project
	Dev     bool
}

func (input *BuildInput) Out() string {
	return filepath.Join(input.Project.PathWorkingDir(), "artifacts", input.Warp.FunctionID)
}

type BuildOutput struct {
	Out     string
	Handler string
	Errors  []string
}

type RunInput struct {
	Project    *project.Project
	Warp       project.Warp
	Links      project.Links
	Server     string
	FunctionID string
	WorkerID   string
	Runtime    string
	Build      *BuildOutput
	Env        []string
}

var runtimes = []Runtime{
	newNodeRuntime(),
	newWorkerRuntime(),
}

func GetRuntime(input string) (Runtime, bool) {
	for _, runtime := range runtimes {
		if runtime.Match(input) {
			return runtime, true
		}
	}
	return nil, false
}

func Build(ctx context.Context, input *BuildInput) (*BuildOutput, error) {
	slog.Info("building function", "runtime", input.Warp.Runtime, "functionID", input.Warp.FunctionID)
	defer slog.Info("function built", "runtime", input.Warp.Runtime, "functionID", input.Warp.FunctionID)
	runtime, ok := GetRuntime(input.Warp.Runtime)
	if !ok {
		return nil, fmt.Errorf("Runtime not found: %v", input.Warp.Runtime)
	}
	out := input.Out()
	if err := os.RemoveAll(out); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(out, 0755); err != nil {
		return nil, err
	}
	result, err := runtime.Build(ctx, input)
	if err != nil {
		return nil, err
	}
	result.Out = out

	if len(input.Warp.CopyFiles) > 0 {
		for _, item := range input.Warp.CopyFiles {
			from, err := filepath.Abs(item.From)
			if err != nil {
				return nil, err
			}
			var dest string
			if item.To != "" {
				dest = filepath.Join(out, item.To)
			} else {
				dest = filepath.Join(out, item.From)
			}
			if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
				return nil, err
			}
			if err := os.Symlink(from, dest); err != nil {
				return nil, err
			}
		}
	}

	return result, nil
}

func Run(ctx context.Context, input *RunInput) (Worker, error) {
	slog.Info("running function", "runtime", input.Runtime, "functionID", input.FunctionID)
	runtime, ok := GetRuntime(input.Runtime)
	input.Env = append(input.Env, "SST_LIVE=true")
	input.Env = append(input.Env, "SST_DEV=true")
	for _, name := range input.Warp.Links {
		value := input.Links[name]
		serialized, _ := json.Marshal(value)
		input.Env = append(input.Env, fmt.Sprintf("SST_RESOURCE_%s=%s", name, serialized))
	}
	if !ok {
		return nil, fmt.Errorf("runtime not found")
	}
	return runtime.Run(ctx, input)
}

func ShouldRebuild(runtime string, functionID string, file string) bool {
	slog.Info("checking if function should be rebuilt", "runtime", runtime, "functionID", functionID, "file", file, "runtime", runtime)
	r, ok := GetRuntime(runtime)
	if !ok {
		return false
	}
	result := r.ShouldRebuild(functionID, file)
	slog.Info("should rebuild", "result", result, "functionID", functionID)
	return result
}
