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
	"github.com/manifoldco/promptui"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server"
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
	err := run()
	if err != nil {
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

`+"```bash"+` title="Install"
curl -fsSL https://ion.sst.dev/install.sh | bash
`+"```"+`

:::note
The CLI currently supports macOS, Linux, and WSL. Windows support is coming soon.
:::

Once installed you can run the commands using.

`+"```bash"+`
sst [command]
`+"```"+`

The CLI takes a few global flags. For example, the deploy command takes the `+"`--stage`"+` flag

`+"```bash"+`
sst deploy --stage=production
`+"```"+`
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

`+"```bash"+` frame="none"
sst [command] --stage=production
`+"```"+`

If the stage is not passed in, then the CLI will:

1. Uses the username on the local machine.
   - If the username is `+"`root`"+`, `+"`admin`"+`, `+"`prod`"+`, `+"`dev`"+`, `+"`production`"+`, then it will prompt for a stage name.
2. Stores this in the `+"`.sst/stage`"+` file and reads from it in the future.

:::tip
The stage that is stored in the `+"`.sst/stage`"+` file is called your local stage.
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

`+"```bash"+` frame="none"
sst [command] --verbose
`+"```"+`
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

`+"```sh"+` frame="none"
sst [command] --help
`+"```"+`

Or for the global help.

`+"```sh"+` frame="none"
sst --help
`+"```"+`
`,
			},
		},
	},
	Children: []*Command{
		{
			Name: "version",
			Description: Description{
				Short: "Print the version",
				Long: `Prints the current version of the CLI.`,
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

`+"```bash"+` frame="none"
sst dev
`+"```"+`

This starts a local server, watch for changes to your code, updates your app, and it runs your functions [Live](/docs/live).

:::note
If your run `+"`sst dev`"+` with a command, it'll not print your your function logs.
:::

If you start your frontend along with `+"`sst dev`"+`, it'll [link your resources](/docs/linking) to it too.

`+"```bash"+` frame="none"
sst dev next dev
`+"```"+`

Starting two instances of `+"`sst dev`"+` in the same project only starts a single _server_. Meaning that the second instance connects to the existing one.

:::note
You can start as many instances of `+"`sst dev`"+` in your app as you want.
:::

This means that you don't need to run `+"`sst dev`"+` separately for your frontend, unlike with SST v2.

:::tip
You don't need to run `+"`sst dev`"+` separately for your frontend, unlike with SST v2.
:::

However, if you are working on your backend functions and your frontend at the same time, you can run `+"`sst dev`"+` to view your functions logs.
`,
			},
			Args: []Argument{
				{
					Name: "command",
					Description: Description{
						Short: "The command to run",
						Long: `A command to also start your frontend.`,
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
            Short: "Start dev mode for SST, Next.js, and link the resources.",
          },
        },
      },
			Run: CmdDev,
		},
		{
			Name: "secret",
			Description: Description{
				Short: "Manage secrets",
				Long: "Manage the secrets in your app defined with `sst.Secret`.",
			},
			Children: []*Command{
				{
					Name: "set",
					Description: Description{
						Short: "Set a secret",
						Long: `
Set the value of the secret.

For example, set the `+"`sst.Secret`"+` called `+"`StripeSecret`"+` to `+"`123456789`"+`.
`,
					},
					Args: []Argument{
						{
							Name:     "name",
							Required: true,
							Description: Description{
								Short: "The name of the secret",
								Long: "The name of the secret.",
							},
						},
						{
							Name:     "value",
							Required: true,
							Description: Description{
								Short: "The value of the secret",
								Long: "The value of the secret.",
							},
						},
					},
					Examples: []Example{
						{
							Content: "sst secret set StripeSecret 123456789",
							Description: Description{
								Short: "Set the StripeSecret to 123456789",
								Long: "Set the `sst.Secret` called `StripeSecret` to `123456789`.",
							},
						},
						{
							Content: "sst secret set StripeSecret productionsecret --stage=production",
							Description: Description{
								Short: "Set the StripeSecret in production",
								Long: "Set the `sst.Secret` called `StripeSecret` in the `production` stage.",
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
						fmt.Println("Secret set")
						return nil
					},
				},
				{
					Name: "list",
					Description: Description{
						Short: "List all secrets",
						Long: "Lists all the secrets.",
					},
					Examples: []Example{
						{
							Content: "sst secret list --stage=production",
							Description: Description{
								Short: "List the secrets in production",
								Long: "Optionally, list the secrets in a specific stage.",
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
						Long: "A command to run.",
					},
				},
			},
			Description: Description{
				Short: "Run command with all resource linked in environment",
				Long: `
Run a command with all the resources linked to the environment.

For example, you can run a node script and use the [Node client](/docs/reference/client) to access *all* the linked resources in your app.

`+"```js"+` title="sst.config.ts"
const myMainBucket = new sst.aws.Bucket("MyMainBucket");
const myAdminBucket = new sst.aws.Bucket("MyAdminBucket");

new sst.aws.Nextjs("MyMainWeb", {
  link: [myMainBucket]
});

new sst.aws.Nextjs("MyAdminWeb", {
  link: [myAdminBucket]
});
`+"```"+`

Now if you run a script.

`+"```bash"+`
sst shell node my-script.js
`+"```"+`

It'll have access to all the buckets from above.

`+"```js"+` title="my-script.js"
import { Resource } from "sst";

console.log(Resource.MyMainBucket.name, Resource.MyAdminBucket.name);
`+"```"+`
`,
			},
      Examples: []Example{
        {
          Content: "sst shell",
          Description: Description{
            Short: "Open a shell session",
            Long: "If no command is passed in, it opens a shell session with the linked resources. This is useful if you want to run multiple commands, all while accessing the linked resources.",
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
			Name: "install",
			Description: Description{
				Short: "Install dependencies specified in sst.config.ts",
				Long: `
Installs the dependencies in `+"`sst.config.ts`"+`.

You'll need to run this when you add a new provider to your config.
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
				Long: "Deploy your application.",
			},
      Examples: []Example{
        {
          Content: "sst deploy --stage=production",
          Description: Description{
            Short: "Deploy to production",
            Long: "Optionally, deploy your app to a specific stage.",
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
				Long: `Removes your application.
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
			Name: "refresh",
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
			Run: func(cli *Cli) error {
				if _, err := os.Stat("sst.config.ts"); err == nil {
					color.New(color.FgRed, color.Bold).Print("❌")
					color.New(color.FgWhite, color.Bold).Println(" sst.config.ts already exists")
					return nil
				}
				template := "vanilla"
				if _, err := os.Stat("next.config.js"); err == nil {
					p := promptui.Select{
						Label:        "Next.js detected, would you like to use the Next.js template?",
						HideSelected: true,
						Items:        []string{"Yes", "No"},
						HideHelp:     true,
					}
					_, result, err := p.Run()
					if err != nil {
						return err
					}
					if result == "Yes" {
						template = "nextjs"
					}
				}
				err := project.Create(template)
				if err != nil {
					return err
				}
				initProject(cli)
				color.New(color.FgGreen, color.Bold).Print("✔")
				color.New(color.FgWhite, color.Bold).Println("  Created new project with '", template, "' template")
				return nil

			},
		},
		{
			Name: "state",
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
				next += len(child.Args.String())
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
				l := len(f.Name) + 2
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
		return nil, util.NewReadableError(err, "Could not initialize project")
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
