package runtime

import (
	"context"
	"fmt"
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
}

type BuildInput struct {
	project.WarpDefinition
	Project *project.Project
	Dev     bool
}

func (input *BuildInput) Out() string {
	return filepath.Join(input.Project.PathWorkingDir(), "artifacts", input.FunctionID)
}

type BuildOutput struct {
	Out     string
	Handler string
	Errors  []string
}

type RunInput struct {
	FunctionID string
	WorkerID   string
	Runtime    string
	Build      *BuildOutput
}

var runtimes = []Runtime{
	newNodeRuntime(),
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
	slog.Info("building function", "runtime", input.Runtime, "functionID", input.FunctionID)
	runtime, ok := GetRuntime(input.Runtime)
	if !ok {
		return nil, fmt.Errorf("Runtime not found: %v", input.Runtime)
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

	return result, nil
}

func Run(ctx context.Context, input *RunInput) (Worker, error) {
	slog.Info("running function", "runtime", input.Runtime, "functionID", input.FunctionID)
	runtime, ok := GetRuntime(input.Runtime)
	if !ok {
		return nil, fmt.Errorf("runtime not found")
	}
	return runtime.Run(ctx, input)
}

func ShouldRebuild(runtime string, functionID string, file string) bool {
	slog.Info("checking if function should be rebuilt", "runtime", runtime, "functionID", functionID, "file", file)
	r, ok := GetRuntime(runtime)
	if !ok {
		return false
	}
	return r.ShouldRebuild(functionID, file)
}
