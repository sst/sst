package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/fatih/color"
	"github.com/sst/ion/cmd/sst/ui"
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

func CmdSecretSet(cli *Cli) error {
	key := cli.Positional(0)
	value := cli.Positional(1)
	if value == "" {
		stat, err := os.Stdin.Stat()
		if err != nil {
			return err
		}
		isTerminal := (stat.Mode() & os.ModeCharDevice) != 0
		if isTerminal {
			fmt.Print("Enter value: ")
		}
		reader := bufio.NewReader(os.Stdin)
		for {
			input, err := reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					break
				}
				return err
			}
			value += input
			if isTerminal {
				break
			}
		}
	}
	if !regexp.MustCompile(`^[A-Z][a-zA-Z0-9]*$`).MatchString(key) {
		return util.NewReadableError(nil, "Secret names must start with a capital letter and contain only letters and numbers")
	}
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
	secrets[key] = value
	err = provider.PutSecrets(backend, p.App().Name, p.App().Stage, secrets)
	if err != nil {
		return util.NewReadableError(err, "Could not set secret")
	}
	http.Post("http://localhost:13557/api/deploy", "application/json", strings.NewReader("{}"))
	ui.Success(fmt.Sprintf("Set \"%s\" for stage \"%s\". Run \"sst deploy\" to update.", key, p.App().Stage))
	return nil
}

func CmdSecretLoad(cli *Cli) error {
	filePath := cli.Positional(0)
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
	file, err := os.Open(filePath)
	if err != nil {
		return util.NewReadableError(err, fmt.Sprintf("Could not open file %s", filePath))
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			ui.Success(fmt.Sprintf("Setting %s", parts[0]))
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			secrets[key] = value
		}
	}
	err = provider.PutSecrets(backend, p.App().Name, p.App().Stage, secrets)
	if err != nil {
		return util.NewReadableError(err, "Could not set secret")
	}
	http.Post("http://localhost:13557/api/deploy", "application/json", strings.NewReader("{}"))
	ui.Success("Run \"sst deploy\" to update.")
	return nil
}
