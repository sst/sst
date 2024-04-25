package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/huh"
	flag "github.com/spf13/pflag"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/joho/godotenv"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/cmd/sst/ui/screen"
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
		err := TransformError(err)
		errorMessage := err.Error()
		if len(errorMessage) > 255 {
			errorMessage = errorMessage[:255]
		}
		telemetry.Track("cli.error", map[string]interface{}{
			"error": errorMessage,
		})
		if readableErr, ok := err.(*util.ReadableError); ok {
			slog.Error("exited with error", "err", readableErr.Unwrap())
			msg := readableErr.Error()
			if msg != "" {
				ui.Error(readableErr.Error())
			}
		} else {
			slog.Error("exited with error", "err", err)
			ui.Error("Unexpected error occurred. Please check the logs or run with --verbose for more details.")
		}
		os.Exit(1)
		return
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

	parsedFlags := map[string]interface{}{}
	Root.registerFlags(parsedFlags)
	flag.CommandLine.Init("sst", flag.ContinueOnError)
	cliParseError := flag.CommandLine.Parse(os.Args[1:])

	positionals := []string{}
	cmds := CommandPath{
		Root,
	}
	for i, arg := range flag.Args() {
		var cmd *Command

		last := cmds[len(cmds)-1]
		if len(last.Children) == 0 {
			positionals = flag.Args()[i:]
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
		cmds = append(cmds, *cmd)
	}
	cli := &Cli{
		flags:     parsedFlags,
		arguments: positionals,
		path:      cmds,
		Context:   ctx,
		cancel:    cancel,
	}
	configureLog(cli)
	if cliParseError != nil {
		return cli.PrintHelp()
	}

	spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	spin.Suffix = "  Updating dependencies..."
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
		Long: strings.Join([]string{
			"The CLI helps you manage your SST apps.",
			"",
			"```bash title=\"Install\"",
			"curl -fsSL https://ion.sst.dev/install | bash",
			"```",
			"",
			":::note",
			"The CLI currently supports macOS, Linux, and WSL. Windows support is coming soon.",
			":::",
			"",
			"#### With a package manager",
			"",
			"You can also use a package manager to install the CLI.",
			"",
			"- **macOS**",
			"",
			"  The CLI is available via a Homebrew Tap, and as downloadable binary in the [releases](https://github.com/sst/ion/releases/latest).",
			"",
			"  ```bash",
			"  brew install sst/tap/sst",
			"",
			"  # Upgrade",
			"  brew upgrade sst",
			"  ```",
			"",
			"  You might have to run `brew upgrade sst`, before the update.",
			"",
			"- **Linux**",
			"",
			"  The CLI is available as downloadable binaries in the [releases](https://github.com/sst/ion/releases/latest). Download the `.deb` or `.rpm` and install with `sudo dpkg -i` and `sudo rpm -i`.",
			"",
			"  For Arch Linux, it's available in the [aur](https://aur.archlinux.org/packages/sst-bin).",
			"",
			"- **Windows**",
			"",
			"  The CLI is available via [Scoop](https://scoop.sh/), and as a downloadable binary in the [releases](https://github.com/sst/ion/releases/latest).",
			"",
			"  ```bash",
			"  scoop bucket add sst https://github.com/sst/scoop-bucket.git",
			"  scoop install sst",
			"",
			"  # Upgrade",
			"  scoop update sst",
			"  ```",
			"",
			"#### Usage",
			"",
			"Once installed you can run the commands using.",
			"",
			"```bash",
			"sst [command]",
			"```",
			"",
			"The CLI takes a few global flags. For example, the deploy command takes the `--stage` flag",
			"",
			"```bash",
			"sst deploy --stage=production",
			"```",
			"",
			"#### Environment variables",
			"",
			"You can access any environment variables set in the CLI in your `sst.config.ts` file. For example, running:",
			"",
			"```bash",
			"ENV_VAR=123 sst deploy",
			"```",
			"",
			"Will let you access `ENV_VAR` through `process.env.ENV_VAR`.",
		}, "\n"),
	},
	Flags: []Flag{
		{
			Name: "stage",
			Type: "string",
			Description: Description{
				Short: "The stage to deploy to",
				Long: strings.Join([]string{
					"Set the stage the CLI is running on.",
					"",
					"```bash frame=\"none\"",
					"sst [command] --stage=production",
					"```",
					"",
					"The stage is a string that is used to prefix the resources in your app. This allows you to have multiple _environments_ of your app running in the same account.",
					"",
					":::tip",
					"Changing the stage will redeploy your app to a new stage with new resources. The old resources will still be around in the old stage.",
					":::",
					"",
					"If the stage is not passed in, then the CLI will:",
					"",
					"1. Use the username on the local machine.",
					"   - If the username is `root`, `admin`, `prod`, `dev`, `production`, then it will prompt for a stage name.",
					"2. Store this in the `.sst/stage` file and reads from it in the future.",
					"",
					"This stored stage is called your **personal stage**.",
				}, "\n"),
			},
		},
		{
			Name: "verbose",
			Type: "bool",
			Description: Description{
				Short: "Enable verbose logging",
				Long: strings.Join([]string{
					"",
					"Enables verbose logging for the CLI output.",
					"",
					"```bash",
					"sst [command] --verbose",
					"```",
					"",
				}, "\n"),
			},
		},
		{
			Name: "help",
			Type: "bool",
			Description: Description{
				Short: "Print help",
				Long: strings.Join([]string{
					"Prints help for the given command.",
					"",
					"```sh frame=\"none\"",
					"sst [command] --help",
					"```",
					"",
					"Or for the global help.",
					"",
					"```sh frame=\"none\"",
					"sst --help",
					"```",
				}, "\n"),
			},
		},
	},
	Children: []*Command{
		{
			Name: "init",
			Description: Description{
				Short: "Initialize a new project",
				Long: strings.Join([]string{
					"Initialize a new project in the current directory. This will create a `sst.config.ts` and `sst install` your providers.",
					"",
					"If this is run in a Next.js, Remix, or Astro project, it'll init SST in drop-in mode.",
				}, "\n"),
			},
			Run: CmdInit,
		},
		{
			Name:   "screen",
			Hidden: true,
			Run: func(cli *Cli) error {
				slog.Info("Running dev2")
				return screen.Start()
			},
		},
		{
			Name: "dev",
			Description: Description{
				Short: "Run in development mode",
				Long: strings.Join([]string{
					"Run your app in development mode. Optionally, pass in a command to start your frontend as well.",
					"",
					"```bash frame=\"none\"",
					"sst dev",
					"```",
					"",
					"You can also pass in a command to start your frontend with it.",
					"",
					"```bash frame=\"none\"",
					"sst dev next dev",
					"```",
					"",
					"To pass in a flag to your command, wrap it in quotes.",
					"",
					"```bash frame=\"none\"",
					"sst dev \"next dev --turbo\"",
					"```",
					"",
					"Dev mode does a few things:",
					"",
					"1. Starts a local server",
					"2. Watches your app config and re-deploys your changes",
					"3. Run your functions [Live](/docs/live/)",
					"4. If you pass in a `command`, it'll:",
					"   - Load your [linked resources](/docs/linking) in the environment",
					"   - And run the command",
					"",
					":::note",
					"If you run `sst dev` with a command, it will not print your function logs.",
					":::",
					"",
					"If `sst dev` starts your frontend, it won't print logs from your SST app. We do this to prevent your logs from being too noisy. To view your logs, you can run `sst dev` in a separate terminal.",
					"",
					":::tip",
					"You can start as many instances of `sst dev` in your app as you want.",
					":::",
					"",
					"Starting multiple instances of `sst dev` in the same project only starts a single _server_. Meaning that the second instance connects to the existing one.",
					"",
					"This is different from SST v2, in that you needed to run `sst dev` and `sst bind` for your frontend.",
				}, "\n"),
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
				{
					Content: "sst dev \"next dev --turbo\"",
					Description: Description{
						Short: "When passing flags wrap command in quotes",
					},
				},
			},
			Run: CmdDev,
		},
		{
			Name: "deploy",
			Description: Description{
				Short: "Deploy your application",
				Long: strings.Join([]string{
					"Deploy your application. By default, it deploys to your personal stage.",
					"",
					"Optionally, deploy your app to a specific stage.",
					"",
					"```bash frame=\"none\"",
					"sst deploy --stage=production",
					"```",
				}, "\n"),
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
					OnEvent: ui.StackEvent,
				})
				if err != nil {
					return err
				}
				return nil
			},
		},
		{
			Name: "add",
			Description: Description{
				Short: "Add a new provider",
				Long: strings.Join([]string{
					"Adds and installs the given provider. For example,",
					"",
					"```bash frame=\"none\"",
					"sst add aws",
					"```",
					"",
					"This command will:",
					"",
					"1. Installs the package for the AWS provider.",
					"2. Add `aws` to the globals in your `sst.config.ts`.",
					"3. And, add it to your `providers`.",
					"",
					"```ts title=\"sst.config.ts\"",
					"{",
					"  providers: {",
					"    aws: true",
					"  }",
					"}",
					"```",
					"",
					"You can use any provider listed in the [Pulumi Registry](https://www.pulumi.com/registry/).",
					"The name of a provider comes from the **URL of the provider** in the Pulumi Registry.",
					"",
					"For example, `https://www.pulumi.com/registry/packages/aws/` is the URL of the AWS Clasic provider. So the name of the provider here is `aws`.",
					"",
					":::note",
					"Running `sst add aws` above is the same as manually adding the provider to your config and running `sst install`.",
					":::",
					"",
					"By default, the latest version of the provider is installed. If you want to use a specific version, you can set it in your config.",
					"",
					"```ts title=\"sst.config.ts\"",
					"{",
					"  providers: {",
					"    aws: {",
					"      version: \"6.27.0\"",
					"    }",
					"  }",
					"}",
					"```",
					"",
					":::tip",
					"You'll need to run `sst install` after you update the `providers` in your config.",
					":::",
				}, "\n"),
			},
			Args: []Argument{
				{
					Name:     "provider",
					Required: true,
					Description: Description{
						Short: "The provider to add",
						Long:  "The provider to add.",
					},
				},
			},
			Run: func(cli *Cli) error {
				pkg := cli.Positional(0)
				spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
				spin.Suffix = "  Adding provider..."
				spin.Start()
				defer spin.Stop()
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}
				stage, err := getStage(cli, cfgPath)
				if err != nil {
					return err
				}
				p, err := project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
					Stage:   stage,
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
				spin.Suffix = "  Downloading provider..."
				p, err = project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
					Stage:   stage,
				})
				if err != nil {
					return err
				}
				err = p.Install()
				if err != nil {
					return err
				}
				spin.Stop()
				ui.Success(fmt.Sprintf("Added provider \"%s\"", pkg))
				return nil
			},
		},
		{
			Name: "install",
			Description: Description{
				Short: "Install all the providers",
				Long: strings.Join([]string{
					"Installs the providers in your `sst.config.ts`. You'll need this command when:",
					"",
					"1. You add a new provider to the `providers` or `home` in your config.",
					"2. Or, when you want to install new providers after you `git pull` some changes.",
					"",
					":::tip",
					"The `sst install` command is similar to `npm install`.",
					":::",
					"",
					"Behind the scenes, it installs the packages for your providers and adds the providers to your globals.",
					"",
					"If you don't have a version specified for your providers in your `sst.config.ts`, it'll install their latest versions.",
				}, "\n"),
			},
			Run: func(cli *Cli) error {
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}

				stage, err := getStage(cli, cfgPath)
				if err != nil {
					return err
				}

				p, err := project.New(&project.ProjectConfig{
					Version: version,
					Config:  cfgPath,
					Stage:   stage,
				})
				if err != nil {
					return err
				}

				spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
				defer spin.Stop()
				spin.Suffix = "  Installing providers..."
				spin.Start()
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
				spin.Stop()
				ui.Success("Installed providers")
				return nil
			},
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
						Long: strings.Join([]string{
							"Set the value of the secret.",
							"",
							"The secrets are encrypted and stored in an S3 Bucket in your AWS account. They are also stored in the package of the functions using the secret.",
							"",
							":::tip",
							"If you are not running `sst dev`, you'll need to `sst deploy` to apply the secret.",
							":::",
							"",
							"For example, set the `sst.Secret` called `StripeSecret` to `123456789`.",
							"",
							"```bash frame=\"none\"",
							"sst secret set StripeSecret dev_123456789",
							"```",
							"",
							"Optionally, set the secret in a specific stage.",
							"",
							"```bash frame=\"none\"",
							"sst secret set StripeSecret prod_123456789 --stage=production",
							"```",
							"",
							"To set something like an RSA key, you can first save it to a file.",
							"",
							"```bash frame=\"none\"",
							"cat > tmp.txt <<EOF",
							"-----BEGIN RSA PRIVATE KEY-----",
							"MEgCQQCo9+BpMRYQ/dL3DS2CyJxRF+j6ctbT3/Qp84+KeFhnii7NT7fELilKUSnx",
							"S30WAvQCCo2yU1orfgqr41mM70MBAgMBAAE=",
							"-----END RSA PRIVATE KEY-----",
							"EOF",
							"```",
							"",
							"Then set the secret from the file.",
							"",
							"```bash frame=\"none\"",
							"sst secret set Key -- \"$(cat tmp.txt)\"",
							"```",
							"",
							"And make sure to delete the temp file.",
						}, "\n"),
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
					Run: CmdSecretSet,
				},
				{
					Name: "load",
					Description: Description{
						Short: "Set multiple secrets from file",
						Long:  strings.Join([]string{}, "\n"),
					},
					Args: []Argument{
						{
							Name:     "file",
							Required: true,
							Description: Description{
								Short: "The file to load secrets from",
								Long:  "The file to load secrets from",
							},
						},
					},
					Examples: []Example{
						{
							Content: "sst secret load ./secrets.env",
							Description: Description{
								Short: "Loads all secrets from the file",
							},
						},
						{
							Content: "sst secret load ./prod.env --stage=production",
							Description: Description{
								Short: "Set secrets for production",
							},
						},
					},
					Run: CmdSecretLoad,
				},
				{
					Name: "remove",
					Description: Description{
						Short: "Remove a secret",
						Long: strings.Join([]string{
							"Remove a secret.",
							"",
							"For example, remove the `sst.Secret` called `StripeSecret`.",
							"",
							"```bash frame=\"none\" frame=\"none\"",
							"sst secret remove StripeSecret",
							"```",
							"",
							"Optionally, remove a secret in a specific stage.",
							"",
							"```bash frame=\"none\" frame=\"none\"",
							"sst secret remove StripeSecret --stage=production",
							"```",
						}, "\n"),
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
							return util.NewReadableError(nil, fmt.Sprintf("Secret \"%s\" does not exist for stage \"%s\"", key, p.App().Stage))
						}

						delete(secrets, key)
						err = provider.PutSecrets(backend, p.App().Name, p.App().Stage, secrets)
						if err != nil {
							return util.NewReadableError(err, "Could not set secret")
						}
						http.Post("http://localhost:13557/api/deploy", "application/json", strings.NewReader("{}"))
						ui.Success(fmt.Sprintf("Removed \"%s\" for stage \"%s\"", key, p.App().Stage))
						return nil
					},
				},
				{
					Name: "list",
					Description: Description{
						Short: "List all secrets",
						Long: strings.Join([]string{
							"Lists all the secrets.",
							"",
							"Optionally, list the secrets in a specific stage.",
							"",
							"```bash frame=\"none\" frame=\"none\"",
							"sst secret list --stage=production",
							"```",
						}, "\n"),
					},
					Examples: []Example{
						{
							Content: "sst secret list --stage=production",
							Description: Description{
								Short: "List the secrets in production",
							},
						},
					},
					Run: CmdSecretList,
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
				Short: "Run a command with linked resources",
				Long: strings.Join([]string{
					"Run a command with all the resources linked to the environment.",
					"",
					"For example, you can run a Node script and use the [JS SDK](/docs/reference/sdk/) to access *all* the linked resources in your app.",
					"",
					"```js title=\"sst.config.ts\"",
					"const myMainBucket = new sst.aws.Bucket(\"MyMainBucket\");",
					"const myAdminBucket = new sst.aws.Bucket(\"MyAdminBucket\");",
					"",
					"new sst.aws.Nextjs(\"MyMainWeb\", {",
					"  link: [myMainBucket]",
					"});",
					"",
					"new sst.aws.Nextjs(\"MyAdminWeb\", {",
					"  link: [myAdminBucket]",
					"});",
					"```",
					"",
					"Now if you run a script.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst shell node my-script.js",
					"```",
					"",
					"It'll have access to all the buckets from above.",
					"",
					"```js title=\"my-script.js\"",
					"import { Resource } from \"sst\";",
					"",
					"console.log(Resource.MyMainBucket.name, Resource.MyAdminBucket.name);",
					"```",
					"",
					"If no command is passed in, it opens a shell session with the linked resources.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst shell",
					"```",
					"",
					"This is useful if you want to run multiple commands, all while accessing the linked resources.",
				}, "\n"),
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
				var args []string
				for _, arg := range cli.arguments {
					args = append(args, strings.Fields(arg)...)
				}
				cwd, _ := os.Getwd()
				currentDir := cwd
				for {
					newPath := filepath.Join(currentDir, "node_modules", ".bin") + string(os.PathListSeparator) + os.Getenv("PATH")
					os.Setenv("PATH", newPath)
					parentDir := filepath.Dir(currentDir)
					if parentDir == currentDir {
						break
					}
					currentDir = parentDir
				}
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

				for key, val := range p.Env() {
					key = strings.ReplaceAll(key, "SST_", "")
					cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, val))
				}
				cmd.Stdout = os.Stdout
				cmd.Stderr = os.Stderr
				cmd.Stdin = os.Stdin
				err = cmd.Run()
				if err != nil {
					return util.NewReadableError(err, err.Error())
				}
				return nil
			},
		},
		{
			Name: "remove",
			Description: Description{
				Short: "Remove your application",
				Long: strings.Join([]string{
					"Removes your application. By default, it removes your personal stage.",
					"",
					":::tip",
					"The resources in your app are removed based on the `removal` setting in your `sst.config.ts`.",
					":::",
					"",
					"Optionally, remove your app from a specific stage.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst remove --stage=production",
					"```",
				}, "\n"),
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
					OnEvent: ui.StackEvent,
				})
				if err != nil {
					return err
				}
				return nil
			},
		},
		{
			Name: "unlock",
			Description: Description{
				Short: "Clear any locks on the app state",
				Long: strings.Join([]string{
					"When you run `sst deploy`, it acquires a lock on your state file to prevent concurrent deploys.",
					"",
					"However, if something unexpectedly kills the `sst deploy` process, or if you manage to run `sst deploy` concurrently, the lock might not be released.",
					"",
					"This should not usually happen, but it can prevent you from deploying. You can run `sst unlock` to release the lock.",
				}, "\n"),
			},
			Run: func(cli *Cli) error {
				p, err := initProject(cli)
				if err != nil {
					return err
				}
				defer p.Cleanup()

				err = p.Stack.Cancel()
				if err != nil {
					return err
				}
				color.New(color.FgGreen, color.Bold).Print("✓ ")
				color.New(color.FgWhite).Print(" Unlocked the app state for: ")
				color.New(color.FgWhite, color.Bold).Println(p.App().Name, "/", p.App().Stage)
				return nil
			},
		},
		{
			Name: "version",
			Description: Description{
				Short: "Print the version of the CLI",
				Long:  `Prints the current version of the CLI.`,
			},
			Run: func(cli *Cli) error {
				fmt.Println(version)
				return nil
			},
		},
		{
			Name: "upgrade",
			Description: Description{
				Short: "Upgrade the CLI",
				Long: strings.Join([]string{
					"Upgrade the CLI to the latest version. Or optionally, pass in a version to upgrade to.",
					"",
					"```bash frame=\"none\"",
					"sst upgrade 0.10",
					"```",
				}, "\n"),
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
				newVersion, err := global.Upgrade(
					version,
					cli.Positional(0),
				)
				if err != nil {
					return err
				}
				newVersion = strings.TrimPrefix(newVersion, "v")

				color.New(color.FgGreen, color.Bold).Print(ui.IconCheck)
				if newVersion == version {
					color.New(color.FgWhite).Printf("  Already on latest %s\n", version)
				} else {
					color.New(color.FgWhite).Printf("  Upgraded %s ➜ ", version)
					color.New(color.FgCyan, color.Bold).Println(newVersion)
				}
				return nil
			},
		},
		{
			Name: "telemetry", Description: Description{
				Short: "Manage telemetry settings",
				Long: strings.Join([]string{
					"Manage telemetry settings.",
					"",
					"SST collects completely anonymous telemetry data about general usage. We track:",
					"- Version of SST in use",
					"- Command invoked, `sst dev`, `sst deploy`, etc.",
					"- General machine information, like the number of CPUs, OS, CI/CD environment, etc.",
					"",
					"This is completely optional and can be disabled at any time.",
				}, "\n"),
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
						return util.NewReadableError(err, "Another instance of SST is already running")
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
			Name: "refresh",
			Description: Description{
				Short: "Refresh the local app state",
				Long: strings.Join([]string{
					"Compares your local state with the state of the resources in the cloud provider. Any changes that are found are adopted into your local state.",
					"",
					"This is useful for cases where you want to ensure that your local state is in sync with your cloud provider.",
				}, "\n"),
			},
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
					OnEvent: ui.StackEvent,
				})
				if err != nil {
					return err
				}
				return nil
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

func (c *Command) registerFlags(parsed map[string]interface{}) {
	for _, f := range c.Flags {
		if f.Type == "string" {
			parsed[f.Name] = flag.String(f.Name, "", "")
		}

		if f.Type == "bool" {
			parsed[f.Name] = flag.Bool(f.Name, false, "")
		}
	}
	for _, child := range c.Children {
		child.registerFlags(parsed)
	}
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
		fmt.Print(strings.Join(prefix, " ") + ": ")
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
				color.New(color.FgWhite, color.Bold).Sprintf("%-*s", maxSubcommand, func() string {
					if len(child.Args) > 0 {
						return strings.Join([]string{child.Name, child.Args.String()}, " ")
					}
					return child.Name
				}()),
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
	godotenv.Load(filepath.Join(p.PathRoot(), ".env"))

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

	spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	defer spin.Stop()
	if !p.CheckPlatform(version) {
		spin.Suffix = "  Upgrading project..."
		spin.Start()
		err := p.CopyPlatform(version)
		if err != nil {
			return nil, util.NewReadableError(err, "Could not copy platform code to project directory")
		}
	}

	if p.NeedsInstall() {
		spin.Suffix = "  Installing providers..."
		spin.Start()
		err = p.Install()
		if err != nil {
			return nil, util.NewReadableError(err, "Could not install dependencies")
		}
	}

	if err := p.LoadHome(); err != nil {
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
				err := huh.NewForm(
					huh.NewGroup(
						huh.NewInput().Title(" Enter name for your personal stage").Prompt(" > ").Value(&stage).Validate(func(v string) error {
							if project.InvalidStageRegex.MatchString(v) {
								return fmt.Errorf("Invalid stage name")
							}
							return nil
						}),
					),
				).WithTheme(huh.ThemeCatppuccin()).Run()
				if err != nil {
					return "", err
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
	stage = project.InvalidStageRegex.ReplaceAllString(stage, "")

	if stage == "root" || stage == "admin" || stage == "prod" || stage == "dev" || stage == "production" {
		return ""
	}

	return stage
}
