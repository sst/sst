package js

import (
	"bufio"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

type EvalOptions struct {
	Dir  string
	Code string
	Env  []string
}

type EvalResult struct {
	Out *bufio.Scanner
	Err *bufio.Scanner

	cmd  *exec.Cmd
	file string
}

func Eval(input EvalOptions) (*EvalResult, error) {
	outfile := filepath.Join(input.Dir,
		"eval",
		fmt.Sprintf("eval-%x.mjs", rand.Int()),
	)
	slog.Info("esbuild building")
	esbuild.Build(esbuild.BuildOptions{
		Banner: map[string]string{
			"js": `
        import { createRequire as topLevelCreateRequire } from 'module';
        const require = topLevelCreateRequire(import.meta.url);
        import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
        const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))
      `,
		},
		External: []string{
			"@pulumi/pulumi",
			"@pulumi/aws",
		},
		Format:   esbuild.FormatESModule,
		Platform: esbuild.PlatformNode,
		Stdin: &esbuild.StdinOptions{
			Contents:   input.Code,
			ResolveDir: input.Dir,
			Sourcefile: "eval.ts",
			Loader:     esbuild.LoaderTS,
		},
		Outfile: outfile,
		Write:   true,
		Bundle:  true,
	})
	slog.Info("esbuild built")
	cmd := exec.Command("node", outfile)
	cmd.Env = append(os.Environ(), input.Env...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	outScanner := bufio.NewScanner(stdout)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	errScanner := bufio.NewScanner(stderr)

	return &EvalResult{
		Out:  outScanner,
		Err:  errScanner,
		cmd:  cmd,
		file: outfile,
	}, nil
}

func (e *EvalResult) Start() error {
	return e.cmd.Start()
}

func (e *EvalResult) Wait() error {
	err := e.cmd.Wait()
	os.Remove(e.file)
	return err
}
