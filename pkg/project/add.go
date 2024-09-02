package project

import (
	"os"
	"os/exec"
	"path/filepath"

	"github.com/sst/ion/pkg/global"
)

func (p *Project) Add(pkg string, version string) error {
	cmd := exec.Command(global.BunPath(), filepath.Join(p.PathPlatformDir(), "src/ast/add.ts"),
		p.PathConfig(),
		pkg,
		version,
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
