package js

import (
	"path/filepath"
	"testing"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/stretchr/testify/assert"
)

func TestFormatError(t *testing.T) {
	t.Run("empty slice", func(t *testing.T) {
		assert.Equal(t, "", FormatError([]esbuild.Message{}))
	})

	t.Run("no location", func(t *testing.T) {
		msgs := []esbuild.Message{{Text: "something broke"}}
		assert.Equal(t, "something broke", FormatError(msgs))
	})

	t.Run("with location", func(t *testing.T) {
		msgs := []esbuild.Message{{
			Text:     "unexpected token",
			Location: &esbuild.Location{File: "app.ts", Line: 10, Column: 5},
		}}
		assert.Equal(t, "app.ts:10:5: unexpected token", FormatError(msgs))
	})

	t.Run("multiple errors", func(t *testing.T) {
		msgs := []esbuild.Message{
			{Text: "err1"},
			{Text: "err2", Location: &esbuild.Location{File: "b.ts", Line: 2, Column: 3}},
		}
		assert.Equal(t, "err1\nb.ts:2:3: err2", FormatError(msgs))
	})
}

func TestIsWithinDir(t *testing.T) {
	root := t.TempDir()
	sstDir := filepath.Join(root, "app.sst-branch", ".sst")

	tests := map[string]struct {
		path string
		want bool
	}{
		"generated file": {
			path: filepath.Join(sstDir, "platform", "config.ts"),
			want: true,
		},
		"generated directory": {
			path: sstDir,
			want: true,
		},
		"project path containing sst": {
			path: filepath.Join(root, "app.sst-branch", "src", "index.ts"),
			want: false,
		},
		"similarly named directory": {
			path: filepath.Join(root, "app.sst-branch", ".sst-other", "index.ts"),
			want: false,
		},
		"parent directory": {
			path: filepath.Join(root, "app.sst-branch"),
			want: false,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			assert.Equal(t, tt.want, isWithinDir(tt.path, sstDir))
		})
	}
}
