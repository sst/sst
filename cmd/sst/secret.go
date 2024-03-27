package main

import (
	"fmt"

	"github.com/fatih/color"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/project/provider"
)

func CmdSecretList(cli *Cli) error {
	p, err := initProject(cli)
	if err != nil {
		return err
	}
	defer p.Cleanup()

	backend := p.Backend()
	secrets, err := provider.GetSecrets(backend, p.App().Name, p.App().Stage)
	if err != nil {
		return util.NewReadableError(err, "Could not get secrets")
	}

	if len(secrets) == 0 {
		return util.NewReadableError(nil, "No secrets found")
	}

	color.White("# %s/%s", p.App().Name, p.App().Stage)
	for key, value := range secrets {
		fmt.Println(key + "=" + value)
	}
	return nil
}
