package js

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

// legacyBanner is the shim this package used to prepend with esbuild's `banner`
// option. It is kept here so the tests below can show that the old approach
// breaks on input the new one handles.
func legacyBanner(userBanner string) string {
	return strings.Join([]string{
		`import { createRequire as topLevelCreateRequire } from 'module';`,
		`const require = topLevelCreateRequire(import.meta.url);`,
		`import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
		`const __filename = topLevelFileUrlToPath(import.meta.url)`,
		`const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
		userBanner,
	}, "\n")
}

// writeCollidingProject lays out a handler that pulls in an ESM dependency
// declaring its own top-level __dirname, __filename and require. Real packages
// do this. `open` v10 is one, and it reaches Lambda bundles through
// mssql -> tedious -> @azure/identity.
//
// The import is dynamic so esbuild wraps the dependency in its lazy __esm
// initialiser, which hoists the module's top-level declarations up to the
// bundle scope. That is where they meet anything the banner declared.
func writeCollidingProject(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	dep := filepath.Join(dir, "node_modules", "esm-dep")
	mustMkdirAll(t, dep)
	mustWriteFile(t, filepath.Join(dep, "package.json"), `{"name":"esm-dep","version":"1.0.0","type":"module","main":"index.js"}`)
	mustWriteFile(t, filepath.Join(dep, "index.js"), `
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function whoami() {
	return { dir: __dirname, file: __filename, req: typeof require };
}
`)
	mustWriteFile(t, filepath.Join(dir, "package.json"), `{"name":"fixture","version":"1.0.0","type":"module"}`)
	mustWriteFile(t, filepath.Join(dir, "handler.js"), `
export const handler = async () => (await import("esm-dep")).whoami();
`)
	return dir
}

// buildESM mirrors the ESM half of Runtime.Build: same format, platform,
// plugins and shim wiring. inject is empty for the legacy banner case.
func buildESM(t *testing.T, dir string, entry string, banner string, inject []string) string {
	t.Helper()
	out := filepath.Join(t.TempDir(), "bundle.mjs")
	result := esbuild.Build(esbuild.BuildOptions{
		EntryPoints:   []string{filepath.Join(dir, entry)},
		AbsWorkingDir: dir,
		Platform:      esbuild.PlatformNode,
		Format:        esbuild.FormatESModule,
		Target:        esbuild.ES2024,
		MainFields:    []string{"module", "main"},
		KeepNames:     true,
		Bundle:        true,
		Write:         true,
		Outfile:       out,
		Plugins:       []esbuild.Plugin{ESMShimsPlugin()},
		Banner:        map[string]string{"js": banner},
		Inject:        inject,
		LogLevel:      esbuild.LogLevelSilent,
	})
	for _, e := range result.Errors {
		t.Fatalf("esbuild build error: %s", e.Text)
	}
	contents, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	return string(contents)
}

// parseErrors reports the syntax errors Node would hit when loading the bundle.
func parseErrors(source string) []string {
	result := esbuild.Transform(source, esbuild.TransformOptions{
		Loader: esbuild.LoaderJS,
		Format: esbuild.FormatESModule,
	})
	messages := make([]string, 0, len(result.Errors))
	for _, e := range result.Errors {
		messages = append(messages, e.Text)
	}
	return messages
}

func TestESMShimsSurviveCollidingDependency(t *testing.T) {
	dir := writeCollidingProject(t)

	bundle := buildESM(t, dir, "handler.js", ESMBanner(""), []string{ESMShimsImport})
	if errs := parseErrors(bundle); len(errs) > 0 {
		t.Fatalf("bundle does not parse: %v", errs)
	}
}

// The legacy banner produced a bundle that failed to parse, so every
// invocation died at init with Runtime.UserCodeSyntaxError. Guard against
// anyone moving the shims back into the banner.
func TestLegacyBannerCollidesWithDependency(t *testing.T) {
	dir := writeCollidingProject(t)

	bundle := buildESM(t, dir, "handler.js", legacyBanner(""), nil)
	errs := parseErrors(bundle)
	if len(errs) == 0 {
		t.Fatal("expected the legacy banner to produce an unparseable bundle")
	}
	if !strings.Contains(strings.Join(errs, "\n"), "already been declared") {
		t.Fatalf("expected a duplicate declaration error, got %v", errs)
	}
}

func TestESMShimsResolveCJSGlobals(t *testing.T) {
	dir := t.TempDir()
	mustWriteFile(t, filepath.Join(dir, "package.json"), `{"name":"fixture","version":"1.0.0","type":"module"}`)
	mustWriteFile(t, filepath.Join(dir, "handler.js"), `
export const handler = async () => ({ dir: __dirname, file: __filename, os: require("os").platform() });
`)

	bundle := buildESM(t, dir, "handler.js", ESMBanner(""), []string{ESMShimsImport})
	if errs := parseErrors(bundle); len(errs) > 0 {
		t.Fatalf("bundle does not parse: %v", errs)
	}
	// __dirname and __filename come from the injected shim...
	if !strings.Contains(bundle, "fileURLToPath(import.meta.url)") {
		t.Error("expected the injected shim to be present in the bundle")
	}
	// ...and require still comes from the banner, named exactly `require` so
	// esbuild's own __require helper picks it up.
	if !strings.Contains(bundle, "const require = topLevelCreateRequire(import.meta.url);") {
		t.Error("expected the banner to define require")
	}
}

// Nothing references the shims here, so esbuild should drop them.
func TestESMShimsAreTreeShakenWhenUnused(t *testing.T) {
	dir := t.TempDir()
	mustWriteFile(t, filepath.Join(dir, "package.json"), `{"name":"fixture","version":"1.0.0","type":"module"}`)
	mustWriteFile(t, filepath.Join(dir, "handler.js"), "export const handler = async () => 1;\n")

	bundle := buildESM(t, dir, "handler.js", ESMBanner(""), []string{ESMShimsImport})
	if strings.Contains(bundle, "fileURLToPath") {
		t.Errorf("expected unused shims to be tree-shaken, got:\n%s", bundle)
	}
}

func TestESMBannerAppendsUserBanner(t *testing.T) {
	banner := ESMBanner("// my banner")
	if !strings.HasSuffix(banner, "// my banner") {
		t.Errorf("user banner not appended: %q", banner)
	}
	if strings.Contains(banner, "__dirname") || strings.Contains(banner, "__filename") {
		t.Errorf("banner must not declare __dirname or __filename: %q", banner)
	}
}

func mustMkdirAll(t *testing.T, dir string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
}

func mustWriteFile(t *testing.T, path string, contents string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}

// Build bundles sst.config.ts, and it hit the same collision: a config that
// pulled in a dependency declaring its own top-level __dirname produced a file
// that would not parse, so every sst command failed.
func TestBuildInjectsShimsForConfig(t *testing.T) {
	dir := t.TempDir()
	mustMkdirAll(t, filepath.Join(dir, ".sst", "platform"))
	dep := filepath.Join(dir, "node_modules", "esm-dep")
	mustMkdirAll(t, dep)
	mustWriteFile(t, filepath.Join(dep, "package.json"), `{"name":"esm-dep","version":"1.0.0","type":"module","main":"index.js"}`)
	mustWriteFile(t, filepath.Join(dep, "index.js"), `
import { fileURLToPath } from "node:url";
import path from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const where = () => ({ dir: __dirname, file: __filename });
`)
	// Globals is empty on some paths, which is when the DisallowImports plugin
	// is active. Its filter matches everything, so check it does not swallow the
	// shim specifier before ESMShimsPlugin sees it.
	for _, globals := range []string{"", "// globals"} {
		out := filepath.Join(dir, "out.mjs")
		result, err := Build(EvalOptions{
			Dir:     dir,
			Outfile: out,
			Globals: globals,
			Code: `
const dep = await import("esm-dep");
export default { dir: __dirname, file: __filename, where: dep.where() };
`,
		})
		if err != nil {
			t.Fatalf("Build(globals=%q) error = %v", globals, err)
		}
		contents, err := os.ReadFile(out)
		if err != nil {
			t.Fatal(err)
		}
		Cleanup(result)
		if errs := parseErrors(string(contents)); len(errs) > 0 {
			t.Fatalf("config bundle (globals=%q) does not parse: %v", globals, errs)
		}
		if !strings.Contains(string(contents), "fileURLToPath(import.meta.url)") {
			t.Errorf("expected the injected shim in the config bundle (globals=%q)", globals)
		}
	}
}
