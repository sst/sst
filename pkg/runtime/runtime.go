package runtime

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/sst/ion/pkg/project"
)

type Runtime interface {
	Match(runtime string) bool
	Build(ctx context.Context, input *BuildInput) error
	Run(ctx context.Context, input *RunInput) error
}

type BuildInput struct {
	project.WarpDefinition
	Project *project.Project
	Dev     bool
}

func (input *BuildInput) Out() string {
	return filepath.Join(input.Project.PathRoot(), "artifacts", input.FunctionID)
}

type RunInput struct {
	project.WarpDefinition
	Project  *project.Project
	WorkerID string
	Dev      bool
}

var runtimes = []Runtime{
	&NodeRuntime{},
}

func GetRuntime(input string) (Runtime, bool) {
	for _, runtime := range runtimes {
		if runtime.Match(input) {
			return runtime, true
		}
	}
	return nil, false
}

func Build(ctx context.Context, input *BuildInput) error {
	slog.Info("building function", "runtime", input.Runtime, "functionID", input.FunctionID)
	runtime, ok := GetRuntime(input.Runtime)
	if !ok {
		return nil
	}
	out := input.Out()
	if err := os.RemoveAll(out); err != nil {
		return err
	}
	if err := os.MkdirAll(out, 0755); err != nil {
		return err
	}
	return runtime.Build(ctx, input)
}

func Run(ctx context.Context, input *RunInput) error {
	slog.Info("running function", "runtime", input.Runtime, "functionID", input.FunctionID)
	runtime, ok := GetRuntime(input.Runtime)
	if !ok {
		return nil
	}
	return runtime.Run(ctx, input)
}

func Invalidate(file string) {

}
