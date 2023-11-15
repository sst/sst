package js

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

func Eval(tmpDir string, code string) ([]byte, error) {
	outfile := filepath.Join(tmpDir, "out.mjs")
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
			// "@pulumi/aws",
		},
		Format:   esbuild.FormatESModule,
		Platform: esbuild.PlatformNode,
		Stdin: &esbuild.StdinOptions{
			Contents:   code,
			ResolveDir: tmpDir,
			Sourcefile: "eval.ts",
			Loader:     esbuild.LoaderTS,
		},
		Outfile: outfile,
		Write:   true,
		Bundle:  true,
	})
	cmd := exec.Command("node", outfile)
	cmd.Env = append(
		os.Environ(),
		"PULUMI_CONFIG_PASSPHRASE=",
	)
	cmd.Dir = tmpDir
	cmd.Stderr = os.Stderr
	output, err := cmd.Output()
	log.Println(string(output))
	if err != nil {
		return nil, err
	}
	return output, nil
}
