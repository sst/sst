package project

import (
	"os"
	"os/exec"
	"path/filepath"
)

func (p *Project) Add(pkg string) error {
	cmd := exec.Command("bun", filepath.Join(p.PathPlatformDir(), "src/ast/add.ts"),
		p.PathConfig(),
		pkg)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

