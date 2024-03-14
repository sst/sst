package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/joho/godotenv"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server"
	"github.com/sst/ion/pkg/telemetry"
)

var version = "dev"

var logFile = (func() *os.File {
	logFile, err := os.CreateTemp("", "sst-*.log")
	if err != nil {
		panic(err)
	}
	return logFile
})()

func main() {
	telemetry.SetVersion(version)
	defer telemetry.Close()
	telemetry.Track("cli.start", map[string]interface{}{
		"args": os.Args[1:],
	})
	err := run()
	if err != nil {
		telemetry.Track("cli.error", map[string]interface{}{
			"error": err.Error(),
		})
		slog.Error("exited with error", "err", err)
		if readableErr, ok := err.(*util.ReadableError); ok {
			msg := readableErr.Error()
			if msg != "" {
				fmt.Println(readableErr.Error())
			}
		} else {
			fmt.Println("Unexpected error occurred. Please check the logs for more details.")
			fmt.Println(err.Error())
		}
		os.Exit(1)
	}
	telemetry.Track("cli.success", map[string]interface{}{})
}

func run() error {
	godotenv.Load()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	interruptChannel := make(chan os.Signal, 1)
	signal.Notify(interruptChannel, syscall.SIGINT)
	go func() {
		<-interruptChannel
		cancel()
	}()

	nonFlags := []string{"sst"}
	flags := []string{}
	for index, arg := range os.Args {
		if strings.HasPrefix(arg, "-") {
			flags = append(flags, arg)
			continue
		}
		if index != 0 {
			nonFlags = append(nonFlags, arg)
		}
	}
	rearranged := append(flags, nonFlags...)
	os.Args = append([]string{os.Args[0]}, rearranged...)

	parsedFlags := map[string]interface{}{}
	positionals := []string{}
	cmds := CommandPath{}
	for i, arg := range nonFlags {
		var cmd *Command
		if i == 0 {
			cmd = &Root
		} else {
			last := cmds[len(cmds)-1]
			if len(last.Children) == 0 {
				positionals = nonFlags[i:]
				break
			}
			for _, c := range last.Children {
				if c.Name == arg {
					cmd = c
					break
				}
			}
			if cmd == nil {
				break
			}
		}
		cmds = append(cmds, *cmd)

		for _, f := range cmd.Flags {
			if f.Type == "string" {
				parsedFlags[f.Name] = flag.String(f.Name, "", "")
			}

			if f.Type == "bool" {
				parsedFlags[f.Name] = flag.Bool(f.Name, false, "")
			}
		}
	}
	flag.Parse()

	cli := &Cli{
		flags:     parsedFlags,
		arguments: positionals,
		path:      cmds,
		Context:   ctx,
		cancel:    cancel,
	}

	configureLog(cli)

	spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	spin.Suffix = "  First run, setting up environment..."
	if global.NeedsPulumi() {
		spin.Start()
		err := global.InstallPulumi()
		if err != nil {
			return err
		}
	}

	if global.NeedsBun() {
		spin.Start()
		err := global.InstallBun()
		if err != nil {
			return err
		}
	}

	if global.NeedsPlugins() {
		spin.Start()
		err := global.InstallPlugins()
		if err != nil {
			return err
		}
	}
	spin.Stop()

	active := cmds[len(cmds)-1]

	required := 0
	for _, arg := range active.Args {
		if !arg.Required {
			continue
		}
		required += 1
	}
	if cli.Bool("help") || active.Run == nil || len(cli.arguments) < required {
		return cli.PrintHelp()
	} else {
		return active.Run(cli)
	}
}

var Root = Command{
	Name: "sst",
	Description: Description{
		Short: "deploy anything",
		Long: `
The CLI helps you manage your SST apps.

` + "```bash" + ` title="Install"
curl -fsSL https://ion.sst.dev/install | bash
` + "```" + `

:::note
The CLI currently supports macOS, Linux, and WSL. Windows support is coming soon.
:::

Once installed you can run the commands using.

` + "```bash" + `
sst [command]
` + "```" + `

The CLI takes a few global flags. For example, the deploy command takes the ` + "`--stage`" + ` flag

` + "```bash" + `
sst deploy --stage=production
` + "```" + `
`,
	},
	Flags: []Flag{
		{
			Name: "stage",
			Type: "string",
			Description: Description{
				Short: "The stage to deploy to",
				Long: `
The stage the CLI is running on.

` + "```bash" + ` frame="none"
sst [command] --stage=production
` + "```" + `

If the stage is not passed in, then the CLI will:

1. Uses the username on the local machine.
   - If the username is ` + "`root`" + `, ` + "`admin`" + `, ` + "`prod`" + `, ` + "`dev`" + `, ` + "`production`" + `, then it will prompt for a stage name.
2. Stores this in the ` + "`.sst/stage`" + ` file and reads from it in the future.

:::tip
The stage that is stored in the ` + "`.sst/stage`" + ` file is called your personal stage.
:::
`,
			},
		},
		{
			Name: "verbose",
			Type: "bool",
			Description: Description{
				Short: "Enable verbose logging",
				Long: `
Enables verbose logging for the CLI output.

` + "```bash" + ` frame="none"
sst [command] --verbose
` + "```" + `
`,
			},
		},
		{
			Name: "help",
			Type: "bool",
			Description: Description{
				Short: "Print help",
				Long: `
Prints help for the given command.

` + "```sh" + ` frame="none"
sst [command] --help
` + "```" + `

Or for the global help.

` + "```sh" + ` frame="none"
sst --help
` + "```" + `
`,
			},
		},
	},
	Children: []*Command{
		{
			Name: "version",
			Description: Description{
				Short: "Print the version",
				Long:  `Prints the current version of the CLI.`,
			},
			Run: func(cli *Cli) error {
				fmt.Printf("ion.%s\n", version)
				return nil
			},
		},
		{
			Name:   "import-unstable",
			Hidden: true,
			Description: Description{
				Short: "(unstable)Import existing resource",
			},
			Args: []Argument{
				{
					Name:     "type",
					Required: true,
					Description: Description{
						Short: "The type of the resource",
					},
				},
				{
					Name:     "name",
					Required: true,
					Description: Description{
						Short: "The name of the resource",
					},
				},
				{
					Name:     "id",
					Required: true,
					Description: Description{
						Short: "The id of the resource",
					},
				},
			},
			Flags: []Flag{
				{
					Type: "string",
					Name: "parent",
					Description: Description{
						Short: "The parent resource",
					},
				},
			},
			Run: func(cli *Cli) error {
				resourceType := cli.Positional(0)
				name := cli.Positional(1)
				id := cli.Positional(2)
				parent := cli.String("parent")

				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()

				err = p.Stack.Import(cli.Context, &project.ImportOptions{
					Type:   resourceType,
					Name:   name,
					ID:     id,
					Parent: parent,
				})
				if err != nil {
					return err
				}

				return nil
			},
		},
		{
			Name: "dev",
			Description: Description{
				Short: "Run in development mode",
				Long: `
Run your app in development mode. Optionally, pass in a command to start your frontend as well.

` + "```bash" + ` frame="none"
sst dev
` + "```" + `

You can also pass in a command to start your frontend with it.

` + "```bash" + ` frame="none"
sst dev next dev
` + "```" + `

Dev mode does a few things:

1. Starts a local server
2. Watches your app config and re-deploys your changes
3. Run your functions [Live](/docs/live/)
4. If you pass in a ` + "`command`" + `, it'll:
   - Load your [linked resources](/docs/linking) in the environment
   - And run the command

:::note
If you run ` + "`sst dev`" + ` with a command, it will not print your function logs.
:::

If ` + "`sst dev`" + ` starts your frontend, it won't print logs from your SST app. We do this to prevent your logs from being too noisy. To view your logs, you can run ` + "`sst dev`" + ` in a separate terminal.

:::tip
You can start as many instances of ` + "`sst dev`" + ` in your app as you want.
:::

Starting multiple instances of ` + "`sst dev`" + ` in the same project only starts a single _server_. Meaning that the second instance connects to the existing one.

This is different from SST v2, in that you needed to run ` + "`sst dev`" + ` and ` + "`sst bind`" + ` for your frontend.
`,
			},
			Args: []Argument{
				{
					Name: "command",
					Description: Description{
						Short: "The command to run",
					},
				},
			},
			Examples: []Example{
				{
					Content: "sst dev",
					Description: Description{
						Short: "",
					},
				},
				{
					Content: "sst dev next dev",
					Description: Description{
						Short: "Start dev mode for SST and Next.js",
					},
				},
			},
			Run: CmdDev,
		},
		{
			Name: "secret",
			Description: Description{
				Short: "Manage secrets",
				Long:  "Manage the secrets in your app defined with `sst.Secret`.",
			},
			Children: []*Command{
				{
					Name: "set",
					Description: Description{
						Short: "Set a secret",
						Long: `
Set the value of the secret.

The secrets are encrypted and stored in an S3 Bucket in your AWS account.

For example, set the ` + "`sst.Secret`" + ` called ` + "`StripeSecret`" + ` to ` + "`123456789`" + `.

` + "```bash" + ` frame="none"
sst secret set StripeSecret 123456789
` + "```" + `

Optionally, set the secret in a specific stage.

` + "```bash" + ` frame="none"
sst secret set StripeSecret productionsecret --stage=production
` + "```" + `
`,
					},
					Args: []Argument{
						{
							Name:     "name",
							Required: true,
							Description: Description{
								Short: "The name of the secret",
								Long:  "The name of the secret.",
							},
						},
						{
							Name:     "value",
							Required: true,
							Description: Description{
								Short: "The value of the secret",
								Long:  "The value of the secret.",
							},
						},
					},
					Examples: []Example{
						{
							Content: "sst secret set StripeSecret 123456789",
							Description: Description{
								Short: "Set the StripeSecret to 123456789",
							},
						},
						{
							Content: "sst secret set StripeSecret productionsecret --stage=production",
							Description: Description{
								Short: "Set the StripeSecret in production",
							},
						},
					},
					Run: func(cli *Cli) error {
						key := cli.Positional(0)
						value := cli.Positional(1)
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
						color.New(color.FgGreen).Print("✔")
						color.New(color.FgWhite).Printf("  Set \"%s\"", key)
						fmt.Println()
						return nil
					},
				},
				{
					Name: "remove",
					Description: Description{
						Short: "Remove a secret",
						Long: `
Remove a secret.

For example, remove the ` + "`sst.Secret`" + ` called ` + "`StripeSecret`" + `.

` + "```bash" + ` frame="none"
sst secret remove StripeSecret
` + "```" + `

Optionally, remove a secret in a specific stage.

` + "```bash" + ` frame="none"
sst secret remove StripeSecret --stage=production
` + "```" + `
`,
					},
					Args: []Argument{
						{
							Name:     "name",
							Required: true,
							Description: Description{
								Short: "The name of the secret",
								Long:  "The name of the secret.",
							},
						},
					},
					Examples: []Example{
						{
							Content: "sst secret remove StripeSecret",
							Description: Description{
								Short: "Remove the StripeSecret",
							},
						},
						{
							Content: "sst secret remove StripeSecret --stage=production",
							Description: Description{
								Short: "Remove the StripeSecret in production",
							},
						},
					},
					Run: func(cli *Cli) error {
						key := cli.Positional(0)
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

						// check if the secret exists
						if _, ok := secrets[key]; !ok {
							color.New(color.FgRed).Print("✗")
							color.New(color.FgWhite).Printf("  \"%s\" does not exist", key)
							fmt.Println()
							return nil
						}

						delete(secrets, key)
						err = provider.PutSecrets(backend, p.App().Name, p.App().Stage, secrets)
						if err != nil {
							return util.NewReadableError(err, "Could not set secret")
						}
						color.New(color.FgGreen).Print("✔")
						color.New(color.FgWhite).Printf("  Removed \"%s\"", key)
						fmt.Println()
						return nil
					},
				},
				{
					Name: "list",
					Description: Description{
						Short: "List all secrets",
						Long: `
Lists all the secrets.

Optionally, list the secrets in a specific stage.

` + "```bash" + ` frame="none"
sst secret list --stage=production
` + "```" + `
`,
					},
					Examples: []Example{
						{
							Content: "sst secret list --stage=production",
							Description: Description{
								Short: "List the secrets in production",
							},
						},
					},
					Run: func(cli *Cli) error {
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
						for key, value := range secrets {
							fmt.Println(key, "=", value)
						}
						return nil
					},
				},
			},
		},
		{
			Name: "shell",
			Args: []Argument{
				{
					Name: "command",
					Description: Description{
						Short: "A command to run",
						Long:  "A command to run.",
					},
				},
			},
			Description: Description{
				Short: "Run command with all resource linked in environment",
				Long: `
Run a command with all the resources linked to the environment.

For example, you can run a Node script and use the [JS SDK](/docs/reference/sdk/) to access *all* the linked resources in your app.

` + "```js" + ` title="sst.config.ts"
const myMainBucket = new sst.aws.Bucket("MyMainBucket");
const myAdminBucket = new sst.aws.Bucket("MyAdminBucket");

new sst.aws.Nextjs("MyMainWeb", {
  link: [myMainBucket]
});

new sst.aws.Nextjs("MyAdminWeb", {
  link: [myAdminBucket]
});
` + "```" + `

Now if you run a script.

` + "```bash" + ` frame="none"
sst shell node my-script.js
` + "```" + `

It'll have access to all the buckets from above.

` + "```js" + ` title="my-script.js"
import { Resource } from "sst";

console.log(Resource.MyMainBucket.name, Resource.MyAdminBucket.name);
` + "```" + `

If no command is passed in, it opens a shell session with the linked resources.

` + "```bash" + ` frame="none"
sst shell
` + "```" + `

This is useful if you want to run multiple commands, all while accessing the linked resources.
`,
			},
			Examples: []Example{
				{
					Content: "sst shell",
					Description: Description{
						Short: "Open a shell session",
					},
				},
			},
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()

				backend := p.Backend()
				links, err := provider.GetLinks(backend, p.App().Name, p.App().Stage)
				if err != nil {
					return err
				}
				args := cli.arguments
				if len(args) == 0 {
					args = append(args, "sh")
				}
				cmd := exec.Command(
					args[0],
					args[1:]...,
				)
				cmd.Env = append(cmd.Env,
					os.Environ()...,
				)
				cmd.Env = append(cmd.Env,
					fmt.Sprintf("PS1=%s/%s> ", p.App().Name, p.App().Stage),
				)

				for resource, value := range links {
					jsonValue, err := json.Marshal(value)
					if err != nil {
						return err
					}

					envVar := fmt.Sprintf("SST_RESOURCE_%s=%s", resource, jsonValue)
					cmd.Env = append(cmd.Env, envVar)
				}
				cmd.Stdout = os.Stdout
				cmd.Stderr = os.Stderr
				cmd.Stdin = os.Stdin
				return cmd.Run()
			},
		},
		{
			Name:   "server",
			Hidden: true,
			Run: func(cli *Cli) error {
				project, err := initProject(cli)
				if err != nil {
					return err
				}
				defer project.Cleanup()

				s, err := server.New(project)
				if err != nil {
					return err
				}

				err = s.Start(cli.Context)
				if err != nil {
					if err == server.ErrServerAlreadyRunning {
						return util.NewReadableError(err, "Server already running")
					}
					return err
				}
				return nil
			},
		},
		{
			Name:   "introspect",
			Hidden: true,
			Run: func(cli *Cli) error {
				data, err := json.MarshalIndent(cli.path[0], "", "  ")
				if err != nil {
					return err
				}
				fmt.Println(string(data))
				return nil
			},
		},
		{
			Name: "add",
			Description: Description{
				Short: "Add a new provider",
        Long: `
Adds a provider to your ` + "`sst.config.ts`" + ` and installs it. For example.

` + "```bash" + ` frame="none"
sst add aws
` + "```" + `

Adds the following to your config.

` + "```ts" + ` title="sst.config.ts"
{
  providers: {
    aws: true
  }
}
` + "```" + `

:::tip
You can get the name of a provider from the URL of the provider in the [Pulumi Registry](https://www.pulumi.com/registry/).
:::

Running ` + "`sst add aws`" + ` above is the same as adding the provider to your config and running ` + "`sst install`" + `.
`,
			},
			Args: []Argument{
				{
					Name:     "provider",
					Required: true,
					Description: Description{
						Short: "The provider to add",
						Long: "The provider to add.",
					},
				},
			},
			Run: func(cli *Cli) error {
				pkg := cli.Positional(0)
				fmt.Println("Adding provider", pkg+"...")
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}

				p, err := project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
				})
				if err != nil {
					return err
				}
				if !p.CheckPlatform(version) {
					err := p.CopyPlatform(version)
					if err != nil {
						return err
					}
				}

				err = p.Add(pkg)
				if err != nil {
					return err
				}
				p, err = project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
				})
				if err != nil {
					return err
				}
				err = p.Install()
				if err != nil {
					return err
				}
				return nil
			},
		},
		{
			Name: "install",
			Description: Description{
				Short: "Install the providers specified in sst.config.ts",
				Long: `
Installs the providers in your ` + "`sst.config.ts`" + `. You'll need this command when:

1. You add a new provider to ` + "`providers`" + ` or ` + "`home`" + ` in your config.
2. Or, when you want to install new providers after you ` + "`git pull`" + ` some changes.

:::tip
The ` + "`sst install`" + ` command is similar to ` + "`npm install`" + `.
:::

Behind the scenes it downloads the packages for the providers and adds the types to your project.
`,
			},
			Run: func(cli *Cli) error {
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}

				p, err := project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
				})
				if err != nil {
					return err
				}

				if !p.CheckPlatform(version) {
					err := p.CopyPlatform(version)
					if err != nil {
						return err
					}
				}

				err = p.Install()
				if err != nil {
					return err
				}

				return nil
			},
		},
		{
			Name: "deploy",
			Description: Description{
				Short: "Deploy your application",
				Long: `
Deploy your application. By default, it deploys to your personal stage.

Optionally, deploy your app to a specific stage.

` + "```bash" + ` frame="none"
sst deploy --stage=production
` + "```" + `
`,
			},
			Examples: []Example{
				{
					Content: "sst deploy --stage=production",
					Description: Description{
						Short: "Deploy to production",
					},
				},
			},
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()

				ui := ui.New(ui.ProgressModeDeploy)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				err = p.Stack.Run(cli.Context, &project.StackInput{
					Command: "up",
					OnEvent: ui.Trigger,
				})
				if err != nil {
					return util.NewReadableError(err, "")
				}
				return nil
			},
		},
		{
			Name: "remove",
			Description: Description{
				Short: "Remove your application",
				Long: `
Removes your application. By default, it removes your personal stage.

:::tip
The resources in your app are removed based on the ` + "`removal` setting" + ` in your ` + "`sst.config.ts`" + `.
:::

Optionally, remove your app from a specific stage.

` + "```bash" + ` frame="none"
sst remove --stage=production
` + "```" + `
`,
			},
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()
				ui := ui.New(ui.ProgressModeRemove)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				err = p.Stack.Run(cli.Context, &project.StackInput{
					Command: "destroy",
					OnEvent: ui.Trigger,
				})
				if err != nil {
					return util.NewReadableError(err, "")
				}
				return nil
			},
		},
		{
			Name:   "refresh",
			Hidden: true,
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()
				ui := ui.New(ui.ProgressModeRefresh)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				err = p.Stack.Run(cli.Context, &project.StackInput{
					Command: "refresh",
					OnEvent: ui.Trigger,
				})
				if err != nil {
					return util.NewReadableError(err, "")
				}
				return nil
			},
		},
		{
			Name: "cancel",
			Description: Description{
				Short: "Cancel any pending deploys",
				Long: `
If something unexpected kills the ` + "`sst deploy`" + ` process, your local state file might be left in an unreadable state.

This will prevent you from deploying again. You can run ` + "`sst cancel`" + ` to clean up the state file and be able to deploy again.

You should not usually run into this.
`,
			},
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()

				err = p.Stack.Cancel()
				if err != nil {
					return util.NewReadableError(err, "")
				}
				fmt.Println("Cancelled any pending deploys for", p.App().Name, "/", p.App().Stage)
				return nil
			},
		},
		{
			Name: "init",
			Description: Description{
				Short: "Init drop-in mode",
				Long: `
Run this to initialize your app in drop-in mode. Currently, supports Next.js apps.

This will create a ` + "`sst.config.ts`" + ` file and configure the types for your project.
`,
			},
			Run: CmdInit,
		},
		{
			Name: "upgrade",
			Description: Description{
				Short: "Upgrade the CLI to the latest version",
				Long: `
Upgrade the CLI to the latest version. Or optionally, pass in a version to upgrade to.

` + "```bash" + ` frame="none"
sst upgrade 0.10
` + "```" + `
`,
			},
			Args: ArgumentList{
				{
					Name: "version",
					Description: Description{
						Short: "A version to upgrade to",
						Long:  "A version to upgrade to.",
					},
				},
			},
			Run: func(cli *Cli) error {
				return global.Upgrade(
					cli.Positional(0),
				)
			},
		},
		{
			Name: "telemetry",
			Description: Description{
				Short: "Control telemetry settings",
				Long: `
Manage telemetry settings.

SST collects completely anonymous telemetry data about general usage. We track:

- Version of SST in use
- Command invoked, ` + "`sst dev`" + `, ` + "`sst deploy`" + `, etc.
- General machine information, like the number of CPUs, OS, CI/CD environment, etc.

This is completely optional and can be disabled at any time.
`,
			},
			Children: []*Command{
				{
					Name: "enable",
					Description: Description{
						Short: "Enable telemetry",
						Long:  "Enable telemetry.",
					},
					Run: func(cli *Cli) error {
						return telemetry.Enable()
					},
				},
				{
					Name: "disable",
					Description: Description{
						Short: "Disable telemetry",
						Long:  "Disable telemetry.",
					},
					Run: func(cli *Cli) error {
						return telemetry.Disable()
					},
				},
			},
		},
		{
			Name:   "state",
			Hidden: true,
			Description: Description{
				Short: "Manage state of your deployment",
			},
			Children: []*Command{
				{
					Name: "edit",
					Description: Description{
						Short: "Edit the state of your deployment",
					},
					Run: func(cli *Cli) error {
						p, err := initProject(cli)
						if err != nil {
							return err
						}
						defer p.Cleanup()

						err = p.Stack.Lock()
						if err != nil {
							return util.NewReadableError(err, "Could not lock state")
						}
						defer p.Stack.Unlock()

						path, err := p.Stack.PullState()
						if err != nil {
							return util.NewReadableError(err, "Could not pull state")
						}
						editor := os.Getenv("EDITOR")
						if editor == "" {
							editor = "vim"
						}
						cmd := exec.Command(editor, path)
						cmd.Stdin = os.Stdin
						cmd.Stdout = os.Stdout
						cmd.Stderr = os.Stderr
						if err := cmd.Start(); err != nil {
							return util.NewReadableError(err, "Could not start editor")
						}
						if err := cmd.Wait(); err != nil {
							return util.NewReadableError(err, "Editor exited with error")
						}
						return p.Stack.PushState()
					},
				},
			},
		},
	},
}

func init() {
	Root.init()
}

type Cli struct {
	flags     map[string]interface{}
	arguments []string
	path      CommandPath
	Context   context.Context
	cancel    context.CancelFunc
}

func (c *Cli) Cancel() {
	c.cancel()
}

func (c *Cli) String(name string) string {
	if f, ok := c.flags[name]; ok {
		return *f.(*string)
	}
	return ""
}

func (c *Cli) Bool(name string) bool {
	if f, ok := c.flags[name]; ok {
		return *f.(*bool)
	}
	return false
}

func (c *Cli) PrintHelp() error {
	return c.path.PrintHelp()
}

func (c *Cli) Arguments() []string {
	return c.arguments
}

func (c *Cli) Positional(index int) string {
	if index >= len(c.arguments) {
		return ""
	}
	return c.arguments[index]
}

type Command struct {
	Name        string               `json:"name"`
	Hidden      bool                 `json:"hidden"`
	Description Description          `json:"description"`
	Args        ArgumentList         `json:"args"`
	Flags       []Flag               `json:"flags"`
	Examples    []Example            `json:"examples"`
	Children    []*Command           `json:"children"`
	Run         func(cli *Cli) error `json:"-"`
}

func (c *Command) init() {
	if c.Args == nil {
		c.Args = ArgumentList{}
	}
	if c.Flags == nil {
		c.Flags = []Flag{}
	}
	if c.Examples == nil {
		c.Examples = []Example{}
	}
	if c.Children == nil {
		c.Children = []*Command{}
	}
	for _, cmd := range c.Children {
		cmd.init()
	}
}

type Example struct {
	Content     string      `json:"content"`
	Description Description `json:"description"`
}

type Argument struct {
	Name        string      `json:"name"`
	Required    bool        `json:"required"`
	Description Description `json:"description"`
}

type Description struct {
	Short string `json:"short,omitempty"`
	Long  string `json:"long,omitempty"`
}

type ArgumentList []Argument

func (a ArgumentList) String() string {
	args := []string{}
	for _, arg := range a {
		if arg.Required {
			args = append(args, "<"+arg.Name+">")
		} else {
			args = append(args, "["+arg.Name+"]")
		}
	}
	return strings.Join(args, " ")
}

type Flag struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"`
	Description Description `json:"description"`
}

type CommandPath []Command

var ErrHelp = util.NewReadableError(nil, "")

func (c CommandPath) PrintHelp() error {
	prefix := []string{}
	for _, cmd := range c {
		prefix = append(prefix, cmd.Name)
	}
	active := c[len(c)-1]

	if len(active.Children) > 0 {
		fmt.Print(color.BlueString(strings.Join(prefix, " ") + ": "))
		fmt.Println(color.WhiteString(c[len(c)-1].Description.Short))

		maxSubcommand := 0
		for _, child := range active.Children {
			if child.Hidden {
				continue
			}
			next := len(child.Name)
			if len(child.Args) > 0 {
				next += len(child.Args.String()) + 1
			}
			if next > maxSubcommand {
				maxSubcommand = next
			}
		}

		fmt.Println()
		for _, child := range active.Children {
			if child.Hidden {
				continue
			}
			fmt.Printf(
				"  %s %s  %s\n",
				strings.Join(prefix, " "),
				color.New(color.FgWhite, color.Bold).Sprintf("%-*s", maxSubcommand, strings.Join([]string{child.Name, child.Args.String()}, " ")),
				child.Description.Short,
			)
		}
	}

	if len(active.Children) == 0 {
		color.New(color.FgWhite, color.Bold).Print("Usage: ")
		color.New(color.FgCyan).Print(strings.Join(prefix, " "))
		if len(active.Args) > 0 {
			color.New(color.FgGreen).Print(" " + active.Args.String())
		}
		fmt.Println()
		fmt.Println()

		color.New(color.FgWhite, color.Bold).Print("Flags:\n")
		maxFlag := 0
		for _, cmd := range c {
			for _, f := range cmd.Flags {
				l := len(f.Name) + 3
				if l > maxFlag {
					maxFlag = l
				}
			}
		}

		for _, cmd := range c {
			for _, f := range cmd.Flags {
				fmt.Printf(
					"  %s  %s\n",
					color.New(color.FgMagenta).Sprintf("--%-*s", maxFlag, f.Name),
					f.Description.Short,
				)
			}
		}

		if len(active.Examples) > 0 {
			fmt.Println()
			color.New(color.FgWhite, color.Bold).Print("Examples:\n")
			for _, example := range active.Examples {
				fmt.Println("  " + example.Content)
			}
		}
	}

	fmt.Println()
	fmt.Printf("Learn more at %s\n", color.MagentaString("https://ion.sst.dev"))

	return ErrHelp
}

func initProject(cli *Cli) (*project.Project, error) {
	slog.Info("initializing project", "version", version)

	cfgPath, err := project.Discover()
	if err != nil {
		return nil, util.NewReadableError(err, "Could not find sst.config.ts")
	}

	stage, err := getStage(cli, cfgPath)
	if err != nil {
		return nil, util.NewReadableError(err, "Could not find stage")
	}

	p, err := project.New(&project.ProjectConfig{
		Version: version,
		Stage:   stage,
		Config:  cfgPath,
	})
	if err != nil {
		return nil, err
	}

	if !p.CheckPlatform(version) {
		spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
		spin.Suffix = "  Installing dependencies..."
		spin.Start()
		err := p.CopyPlatform(version)
		if err != nil {
			return nil, util.NewReadableError(err, "Could not copy platform code to project directory")
		}
		err = p.Install()
		if err != nil {
			return nil, util.NewReadableError(err, "Could not install dependencies")
		}
		spin.Stop()
	}

	_, err = logFile.Seek(0, 0)
	if err != nil {
		return nil, err
	}
	nextLogFile, err := os.Create(filepath.Join(p.PathWorkingDir(), "sst.log"))
	if err != nil {
		return nil, util.NewReadableError(err, "Could not create log file")
	}
	_, err = io.Copy(nextLogFile, logFile)
	if err != nil {
		return nil, util.NewReadableError(err, "Could not copy log file")
	}
	logFile = nextLogFile
	configureLog(cli)

	if err := p.LoadProviders(); err != nil {
		return nil, util.NewReadableError(err, err.Error())
	}

	app := p.App()
	slog.Info("loaded config", "app", app.Name, "stage", app.Stage)

	return p, nil
}

func configureLog(cli *Cli) {
	writers := []io.Writer{logFile}
	if cli.Bool("verbose") {
		writers = append(writers, os.Stderr)
	}
	writer := io.MultiWriter(writers...)
	slog.SetDefault(
		slog.New(slog.NewTextHandler(writer, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})),
	)
}

func getStage(cli *Cli, cfgPath string) (string, error) {
	stage := cli.String("stage")
	if stage == "" {
		stage = project.LoadPersonalStage(cfgPath)
		if stage == "" {
			stage = guessStage()
			if stage == "" {
				for {
					fmt.Print("Enter a stage name for your personal stage: ")
					_, err := fmt.Scanln(&stage)
					if err != nil {
						continue
					}
					if stage == "" {
						continue
					}
					break
				}
			}
			err := project.SetPersonalStage(cfgPath, stage)
			if err != nil {
				return "", err
			}
		}
	}
	godotenv.Load(fmt.Sprintf(".env.%s", stage))
	return stage, nil
}

func guessStage() string {
	u, err := user.Current()
	if err != nil {
		return ""
	}
	stage := strings.ToLower(u.Username)

	if stage == "root" || stage == "admin" || stage == "prod" || stage == "dev" || stage == "production" {
		return ""
	}

	return stage
}
