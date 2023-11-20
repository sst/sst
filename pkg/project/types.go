package project

import (
	"log/slog"
	"os"
	"path/filepath"
)

const TYPES_DATA = `
import "@types/node";
import _util from "@pulumi/pulumi";
import _aws from "@pulumi/aws";

declare global {
  // @ts-expect-error
  export const aws: typeof _aws;

  // @ts-expect-error
  export const util: typeof _util;

  export const sst: {
    region: string
    bootstrap: {
      bucket: string
    }
  }
}

`

func (p *Project) GenerateTypes() error {
	path := filepath.Join(
		p.PathTemp(),
		"types",
		"global.d.ts",
	)
	slog.Info("generating types", "path", path)
	err := os.MkdirAll(filepath.Dir(path), 0755)
	if err != nil {
		return err
	}
	err = os.WriteFile(
		path,
		[]byte(TYPES_DATA),
		0644,
	)
	if err != nil {
		return err
	}

	return nil

}
