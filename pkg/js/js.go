package js

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sst/ion/pkg/global"
)

type EvalOptions struct {
	Dir    string
	Code   string
	Env    []string
	Banner string
	Inject []string
	Define map[string]string
}

type EvalResult struct {
	Out *bufio.Scanner
	Err *bufio.Scanner

	cmd  *exec.Cmd
	file string
}

type Process struct {
	cmd *exec.Cmd
	in  io.WriteCloser
	Out *bufio.Scanner
}

type Command = string

const (
	CommandDone   Command = "~d"
	CommandJSON   Command = "~j"
	CommandStdOut Command = ""
)

const LOOP = `
  import readline from "readline"
  import fs from "fs/promises"

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.on("line", async (line) => {
    const msg = JSON.parse(line)
    if (msg.type === "eval") {
      try {
        const result = await import(msg.module)
      } catch(ex) {
        console.log(ex)
      } finally {
        // await fs.rm(msg.module)
        console.log("~d")
      }
    }
  })

  rl.on("close", () => {
    process.exit(0)
  })
`

func Start(dir string) (*Process, error) {
	err := os.RemoveAll(filepath.Join(dir, "eval"))
	if err != nil {
		return nil, err
	}
	loopPath :=
		filepath.Join(
			global.ConfigDir(),
			"loop.mjs",
		)
	err = os.WriteFile(
		loopPath,
		[]byte(LOOP),
		0644,
	)
	if err != nil {
		return nil, err
	}
	cmd := exec.Command("node", "--no-warnings", "--input-type=module", "-e", LOOP)
	cmd.Dir = dir

	stdIn, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}

	stdOut, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	cmd.Stderr = os.Stderr

	scanner := bufio.NewScanner(io.MultiReader(
		stdOut,
	))
	const maxCapacity = 1024 * 1024 // 1 MB
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	err = cmd.Start()
	if err != nil {
		return nil, err
	}

	return &Process{
		cmd: cmd,
		in:  stdIn,
		Out: scanner,
	}, nil
}

func (p *Process) Scan() (Command, string) {
	for p.Out.Scan() {
		line := p.Out.Text()

		if line == CommandDone {
			break
		}

		if strings.HasPrefix(line, CommandJSON) {
			return CommandJSON, line[len(CommandJSON):]
		}

		return CommandStdOut, line
	}
	err := p.Out.Err()
	if err != nil {
		panic(err)
	}
	return CommandDone, ""
}

type Message struct {
}

type EvalMessage struct {
	Type   string `json:"type"`
	Module string `json:"module"`
}

func (p *Process) Eval(input EvalOptions) error {
	outfile := filepath.Join(input.Dir,
		"eval",
		fmt.Sprintf("eval-%v.mjs", time.Now().UnixMilli()),
	)
	slog.Info("esbuild building")
	result := esbuild.Build(esbuild.BuildOptions{
		Banner: map[string]string{
			"js": `
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))
` + input.Banner,
		},
		MainFields: []string{"module", "main"},
		External: []string{
			"@pulumi/*",
			"@aws-sdk/*",
			"esbuild",
			"archiver",
			"glob",
		},
		Format:    esbuild.FormatESModule,
		Platform:  esbuild.PlatformNode,
		Sourcemap: esbuild.SourceMapInline,
		Stdin: &esbuild.StdinOptions{
			Contents:   input.Code,
			ResolveDir: input.Dir,
			Sourcefile: "eval.ts",
			Loader:     esbuild.LoaderTS,
		},
		Define:  input.Define,
		Inject:  input.Inject,
		Outfile: outfile,
		Write:   true,
		Bundle:  true,
	})
	if len(result.Errors) > 0 {
		slog.Error("esbuild errors", "errors", result.Errors)
		return fmt.Errorf("esbuild errors: %v", result.Errors)
	}
	slog.Info("esbuild built")

	slog.Info("sending eval message", "module", outfile)
	bytes, err := json.Marshal(EvalMessage{
		Type:   "eval",
		Module: outfile,
	})
	if err != nil {
		return err
	}

	_, err = p.in.Write(bytes)
	if err != nil {
		return err
	}
	_, err = p.in.Write([]byte("\n"))
	if err != nil {
		return err
	}

	return nil
}

func Eval(input EvalOptions) (*Process, error) {
	outfile := filepath.Join(input.Dir,
		"eval",
		fmt.Sprintf("eval-%v.mjs", time.Now().UnixMilli()),
	)
	slog.Info("esbuild building")
	result := esbuild.Build(esbuild.BuildOptions{
		Banner: map[string]string{
			"js": `
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))
` + input.Banner,
		},
		MainFields: []string{"module", "main"},
		External: []string{
			"@pulumi/*",
			"@aws-sdk/*",
			"esbuild",
			"archiver",
			"glob",
		},
		Format:    esbuild.FormatESModule,
		Platform:  esbuild.PlatformNode,
		Sourcemap: esbuild.SourceMapInline,
		Stdin: &esbuild.StdinOptions{
			Contents:   input.Code,
			ResolveDir: input.Dir,
			Sourcefile: "eval.ts",
			Loader:     esbuild.LoaderTS,
		},
		Define:  input.Define,
		Inject:  input.Inject,
		Outfile: outfile,
		Write:   true,
		Bundle:  true,
	})
	if len(result.Errors) > 0 {
		slog.Error("esbuild errors", "errors", result.Errors)
		return nil, fmt.Errorf("esbuild errors: %v", result.Errors)
	}
	slog.Info("esbuild built")

	slog.Info("sending eval message", "module", outfile)

	cmd := exec.Command("node", "--no-warnings", outfile)

	stdIn, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}

	stdOut, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	cmd.Stderr = os.Stderr

	scanner := bufio.NewScanner(io.MultiReader(
		stdOut,
	))
	const maxCapacity = 1024 * 1024 // 1 MB
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	err = cmd.Start()
	if err != nil {
		return nil, err
	}

	return &Process{
		cmd: cmd,
		in:  stdIn,
		Out: scanner,
	}, nil
}
