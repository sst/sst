package project

import (
	"encoding/json"
	"testing"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

// buildResultWithMap fabricates an esbuild result shaped like the config build:
// OutputFiles[0] is the linked sourcemap, OutputFiles[1] the bundle. The mappings
// field is derived from the $cli payload to mimic the real position shifts that a
// different-length $cli causes in the output file.
func buildResultWithMap(t *testing.T, cli string, configSource string) esbuild.BuildResult {
	t.Helper()
	sourcemap := map[string]interface{}{
		"version":        3,
		"sources":        []string{"<define:$cli>", "<define:$app>", "eval.ts", "sst.config.ts"},
		"sourcesContent": []string{cli, `{"name":"mercury"}`, "import mod from 'sst.config.ts'", configSource},
		"mappings":       "AAAA;" + cli,
		"names":          []string{},
	}
	contents, err := json.Marshal(sourcemap)
	if err != nil {
		t.Fatal(err)
	}
	return esbuild.BuildResult{
		OutputFiles: []esbuild.OutputFile{
			{Path: "/x/.sst/platform/sst.config.123.mjs.map", Contents: contents, Hash: "raw-map-" + cli},
			{Path: "/x/.sst/platform/sst.config.123.mjs", Contents: []byte("bundle"), Hash: "raw-js"},
		},
	}
}

func TestDevSkipBundleHashIgnoresCliDefine(t *testing.T) {
	// The $cli define embeds state.version (the previous deployment's per-component
	// versions map), so two builds of identical source differing only in prior state
	// must produce the same bundle hash — otherwise every state-changing session
	// costs one spurious full deploy on the next startup.
	emptyState := buildResultWithMap(t, `{"state":{"version":{}}}`, "export default {}")
	fullState := buildResultWithMap(t, `{"state":{"version":{"MyFunction":1,"MyBus":2}}}`, "export default {}")
	if devSkipBundleHash(emptyState) != devSkipBundleHash(fullState) {
		t.Fatal("bundle hash must not change when only <define:$cli> differs")
	}
}

func TestDevSkipBundleHashDetectsSourceChange(t *testing.T) {
	before := buildResultWithMap(t, `{"state":{"version":{}}}`, "export default {}")
	after := buildResultWithMap(t, `{"state":{"version":{}}}`, "export default { changed: true }")
	if devSkipBundleHash(before) == devSkipBundleHash(after) {
		t.Fatal("bundle hash must change when a real source changes")
	}
}

func TestDevSkipBundleHashDetectsAppDefineChange(t *testing.T) {
	base := buildResultWithMap(t, `{}`, "export default {}")
	changed := buildResultWithMap(t, `{}`, "export default {}")
	var sourcemap map[string]interface{}
	json.Unmarshal(changed.OutputFiles[0].Contents, &sourcemap)
	sourcemap["sourcesContent"].([]interface{})[1] = `{"name":"mercury","removal":"retain"}`
	contents, _ := json.Marshal(sourcemap)
	changed.OutputFiles[0].Contents = contents
	if devSkipBundleHash(base) == devSkipBundleHash(changed) {
		t.Fatal("bundle hash must change when <define:$app> changes")
	}
}

func TestDevSkipBundleHashFallsBackWithoutSourcemap(t *testing.T) {
	noMap := esbuild.BuildResult{
		OutputFiles: []esbuild.OutputFile{
			{Path: "/x/sst.config.123.mjs", Contents: []byte("bundle"), Hash: "raw-js"},
		},
	}
	if devSkipBundleHash(noMap) != "raw-js" {
		t.Fatal("must fall back to the first output file's hash when no sourcemap exists")
	}
	malformed := esbuild.BuildResult{
		OutputFiles: []esbuild.OutputFile{
			{Path: "/x/sst.config.123.mjs.map", Contents: []byte("not json"), Hash: "raw-map"},
		},
	}
	if devSkipBundleHash(malformed) != "raw-map" {
		t.Fatal("must fall back to the first output file's hash when the sourcemap is unparseable")
	}
	if devSkipBundleHash(esbuild.BuildResult{}) != "" {
		t.Fatal("must return empty string when there are no output files")
	}
}
