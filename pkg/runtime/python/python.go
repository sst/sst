package python

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/BurntSushi/toml"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project/path"
	"github.com/sst/ion/pkg/runtime"
)

type Worker struct {
	stdout io.ReadCloser
	stderr io.ReadCloser
	cmd    *exec.Cmd
}

func (w *Worker) Stop() {
	// Terminate the whole process group
	util.TerminateProcess(w.cmd.Process.Pid)
}

func (w *Worker) Logs() io.ReadCloser {
	reader, writer := io.Pipe()

	go func() {
		defer writer.Close()

		var wg sync.WaitGroup
		wg.Add(2)

		copyStream := func(dst io.Writer, src io.Reader, name string) {
			defer wg.Done()
			buf := make([]byte, 1024)
			for {
				n, err := src.Read(buf)
				if n > 0 {
					_, werr := dst.Write(buf[:n])
					if werr != nil {
						slog.Error("error writing to pipe", "stream", name, "err", werr)
						return
					}
				}
				if err != nil {
					if err != io.EOF {
						slog.Error("error reading from stream", "stream", name, "err", err)
					}
					return
				}
			}
		}

		go copyStream(writer, w.stdout, "stdout")
		go copyStream(writer, w.stderr, "stderr")

		wg.Wait()
	}()

	return reader
}

type PythonRuntime struct {
	lastBuiltHandler map[string]string
}

func New() *PythonRuntime {
	return &PythonRuntime{
		lastBuiltHandler: map[string]string{},
	}
}

func (r *PythonRuntime) Build(ctx context.Context, input *runtime.BuildInput) (*runtime.BuildOutput, error) {
	slog.Info("building python function", "handler", input.Handler)

	file, ok := r.getFile(input)
	if !ok {
		return nil, fmt.Errorf("handler not found: %v", input.Handler)
	}
	filepath.Rel(path.ResolveRootDir(input.CfgPath), file)
	targetDir := filepath.Join(input.Out(), filepath.Dir(input.Handler))
	if err := os.MkdirAll(targetDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create target directory: %v", err)
	}

	target := filepath.Join(targetDir, filepath.Base(file))

	slog.Info("Copying python function", "file", file, "target", target)

	// Copy the handler file to the output directory
	if err := copyFile(file, target); err != nil {
		return nil, err
	}

	// Find the closest pyproject.toml
	startingPath := filepath.Dir(file)
	pyProjectFile, err := FindClosestPyProjectToml(startingPath)
	if err != nil {
		return nil, err
	}

	// Copy pyproject.toml to the output directory
	if err := copyFile(pyProjectFile, filepath.Join(targetDir, filepath.Base(pyProjectFile))); err != nil {
		return nil, err
	}

	r.lastBuiltHandler[input.FunctionID] = file

	errors := []string{}

	return &runtime.BuildOutput{
		Handler: input.Handler,
		Errors:  errors,
	}, nil
}

func (r *PythonRuntime) Match(runtime string) bool {
	return strings.HasPrefix(runtime, "python")
}

type PyProject struct {
	Project struct {
		Dependencies []string `toml:"dependencies"`
	} `toml:"project"`
	Tool struct {
		Uv struct {
			Sources map[string]struct {
				URL string `toml:"url"`
			} `toml:"sources"`
		} `toml:"uv"`
	} `toml:"tool"`
}

func (r *PythonRuntime) Run(ctx context.Context, input *runtime.RunInput) (runtime.Worker, error) {
	// Get the directory of the Handler
	handlerDir := filepath.Dir(filepath.Join(input.Build.Out, input.Build.Handler))

	// We have to manually construct the dependencies to install because uv curerntly does not support importing a
	// foreign pyproject.toml as a configuration file and we have to run the python-runtime file rather than
	// the handler file

	// Get the absolute path of the pyproject.toml file
	pyprojectFile, err := FindClosestPyProjectToml(handlerDir)
	if err != nil {
		return nil, err
	}

	// Decode the TOML file
	var pyProject PyProject
	if _, err := toml.DecodeFile(pyprojectFile, &pyProject); err != nil {
		slog.Error("Error decoding TOML file: %v", err)
	}

	// Extract the dependencies
	dependencies := pyProject.Project.Dependencies

	// Extract the sources
	sources := pyProject.Tool.Uv.Sources

	args := []string{
		"run",
		"--with",
		"requests",
	}

	for _, dep := range dependencies {
		args = append(args, "--with", dep)
	}

	// If sources are specified, use them
	if len(sources) > 0 {
		for _, source := range sources {
			args = append(args, "--find-links", source.URL)
		}
	}

	args = append(args,
		filepath.Join(path.ResolvePlatformDir(input.CfgPath), "/dist/python-runtime/index.py"),
		filepath.Join(input.Build.Out, input.Build.Handler),
		input.WorkerID,
	)

	uvPath := global.UvPath()

	cmd := exec.CommandContext(
		ctx,
		uvPath,
		args...)

	util.SetProcessGroupID(cmd)
	cmd.Cancel = func() error {
		return util.TerminateProcess(cmd.Process.Pid)
	}

	cmd.Env = append(input.Env, "AWS_LAMBDA_RUNTIME_API="+input.Server)
	slog.Info("starting worker", "env", cmd.Env, "args", cmd.Args)
	cmd.Dir = input.Build.Out
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %v", err)
	}
	cmd.Start()
	return &Worker{
		stdout,
		stderr,
		cmd,
	}, nil
}

func (r *PythonRuntime) ShouldRebuild(functionID string, file string) bool {
	return true
}

var PYTHON_EXTENSIONS = []string{".py"}

func (r *PythonRuntime) getFile(input *runtime.BuildInput) (string, bool) {
	slog.Info("getting python file", "handler", input.Handler)
	dir := filepath.Dir(input.Handler)
	base := strings.TrimSuffix(filepath.Base(input.Handler), filepath.Ext(input.Handler))
	for _, ext := range PYTHON_EXTENSIONS {
		file := filepath.Join(path.ResolveRootDir(input.CfgPath), dir, base+ext)
		if _, err := os.Stat(file); err == nil {
			return file, true
		}
	}
	return "", false
}

func copyFile(src, dst string) error {
	// Open the source file
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	// Create the destination file
	destinationFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destinationFile.Close()

	// Copy the content from source to destination
	_, err = io.Copy(destinationFile, sourceFile)
	if err != nil {
		return err
	}

	// Flush the writes to stable storage
	err = destinationFile.Sync()
	if err != nil {
		return err
	}

	return nil
}

// FindClosestPyProjectToml traverses up the directory tree to find the closest pyproject.toml file.
func FindClosestPyProjectToml(startingPath string) (string, error) {
	dir := startingPath
	for {
		pyProjectFile := filepath.Join(dir, "pyproject.toml")
		if _, err := os.Stat(pyProjectFile); err == nil {
			return pyProjectFile, nil
		}

		// Move up one directory
		parentDir := filepath.Dir(dir)
		if parentDir == dir {
			// Reached the root directory
			break
		}
		dir = parentDir
	}
	return "", fmt.Errorf("pyproject.toml not found")
}
