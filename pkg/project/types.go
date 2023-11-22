package project

import (
	"log/slog"
	"os"
	"path/filepath"
)

const TYPES_DATA = `
import "../src/index";
import "@types/node";
import "@pulumi/aws";
import "@pulumi/pulumi";

declare global {
  // @ts-expect-error
  export import aws = require("@pulumi/aws");

  // @ts-expect-error
  export import util = require("@pulumi/pulumi");

  // @ts-expect-error
  export import sst = require("../src/index");


  export const app: {
    region: string;
    bootstrap: {
      bucket: string;
    };
  };
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
