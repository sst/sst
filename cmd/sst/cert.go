package main

import (
	"os"
	"os/exec"
	"path/filepath"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/pkg/global"
)

var CmdCert = &cli.Command{
	Name: "cert",
	Description: cli.Description{
		Short: "Manage certificates.",
		Long:  "",
	},
	Run: func(c *cli.Cli) error {
		err := global.EnsureMkcert()
		if err != nil {
			return err
		}
		env := os.Environ()
		env = append(env, "CAROOT="+global.CertPath())
		cmd := exec.Command("mkcert", "-install")
		cmd.Env = env
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		err = cmd.Run()
		if err != nil {
			return err
		}
		cmd = exec.Command(
			"mkcert",
			"-key-file", filepath.Join(global.CertPath(), "key.pem"),
			"-cert-file", filepath.Join(global.CertPath(), "cert.pem"),
			"127.0.0.1",
			"localhost",
		)
    cmd.Env = env
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		err = cmd.Run()
		if err != nil {
			return err
		}
		return nil
	},
}
