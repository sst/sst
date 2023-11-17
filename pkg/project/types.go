package project

import (
	"log/slog"
	"os"
	"path/filepath"
)

const TYPES_DATA = `
import type * as _aws from "@pulumi/aws";
import type * as _util from "@pulumi/pulumi";

declare global {
  export const aws: typeof _aws;
  export const util: typeof _util;
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
