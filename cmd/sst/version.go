package main

import (
	"fmt"

	"github.com/pulumi/pulumi/sdk/v3"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/pkg/global"
)

var CmdVersion = &cli.Command{
	Name: "version",
	Description: cli.Description{
		Short: "Print the version of the CLI",
		Long:  `Prints the current version of the CLI.`,
	},
	Run: func(cli *cli.Cli) error {
		fmt.Println("sst", version)
		if cli.Bool("verbose") {
			fmt.Println("pulumi", sdk.Version)
			fmt.Println("config", global.ConfigDir())
		}
		return nil
	},
}
