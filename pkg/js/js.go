package js

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"time"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

type EvalOptions struct {
	Dir    string
	Code   string
	Env    []string
	Banner string
	Inject []string
	Define map[string]string
}

func Build(input EvalOptions) (esbuild.BuildResult, error) {
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
		Define:   input.Define,
		Inject:   input.Inject,
		Outfile:  outfile,
		Write:    true,
		Bundle:   true,
		Metafile: true,
	})
	if len(result.Errors) > 0 {
		slog.Error("esbuild errors", "errors", result.Errors)
		return result, fmt.Errorf("esbuild errors: %v", result.Errors)
	}
	slog.Info("esbuild built", "outfile", outfile)

	return result, nil
}
