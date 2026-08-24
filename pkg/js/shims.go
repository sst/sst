package js

import (
	"strings"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

// ESMShimsImport is the module specifier injected into every ESM bundle. It is
// resolved by ESMShimsPlugin rather than from disk.
const ESMShimsImport = "sst:esm-shims"

const esmShimsNamespace = "sst-esm-shims"

// ESMShimsSource shims CommonJS's __dirname and __filename for ESM output.
//
// These are injected instead of prepended with esbuild's `banner` option
// because a banner is opaque text that esbuild never parses. Its renamer
// cannot see the names a banner declares, so when a bundled module declares
// its own top-level __dirname or __filename esbuild hoists that declaration
// next to the banner's and the whole bundle fails to parse:
//
//	SyntaxError: Identifier '__dirname' has already been declared
//
// That kills the module while it is being loaded, before any of our code runs.
// Injected files are real modules in the graph, so esbuild renames them
// whenever they collide. This is the same approach tsup takes for its `shims`
// option.
//
// `require` stays in the banner. esbuild's own __require helper looks for a
// binding named exactly `require`, so ours must not be renamed, and it has to
// be initialised above that helper. esbuild already renames a bundled module's
// own `require` declaration, so that name cannot collide.
const ESMShimsSource = `
import path from "node:path";
import { fileURLToPath } from "node:url";

const getFilename = () => fileURLToPath(import.meta.url);
const getDirname = () => path.dirname(getFilename());

export const __filename = /* @__PURE__ */ getFilename();
export const __dirname = /* @__PURE__ */ getDirname();
`

// ESMBanner builds the banner for an ESM bundle, with userBanner appended. It
// only sets up `require`; see ESMShimsSource for why __dirname and __filename
// are injected instead.
func ESMBanner(userBanner string) string {
	return strings.Join([]string{
		`import { createRequire as topLevelCreateRequire } from 'module';`,
		`const require = topLevelCreateRequire(import.meta.url);`,
		userBanner,
	}, "\n")
}

// ESMShimsPlugin serves ESMShimsSource for ESMShimsImport. Register it on any
// build that injects ESMShimsImport.
func ESMShimsPlugin() esbuild.Plugin {
	return esbuild.Plugin{
		Name: esmShimsNamespace,
		Setup: func(build esbuild.PluginBuild) {
			build.OnResolve(esbuild.OnResolveOptions{Filter: `^sst:esm-shims$`}, func(args esbuild.OnResolveArgs) (esbuild.OnResolveResult, error) {
				return esbuild.OnResolveResult{Path: ESMShimsImport, Namespace: esmShimsNamespace}, nil
			})
			build.OnLoad(esbuild.OnLoadOptions{Filter: `.*`, Namespace: esmShimsNamespace}, func(args esbuild.OnLoadArgs) (esbuild.OnLoadResult, error) {
				contents := ESMShimsSource
				return esbuild.OnLoadResult{Contents: &contents, Loader: esbuild.LoaderJS}, nil
			})
		},
	}
}
