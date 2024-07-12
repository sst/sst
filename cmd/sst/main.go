package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/nrednav/cuid2"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/joho/godotenv"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic"
	"github.com/sst/ion/cmd/sst/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
	"github.com/sst/ion/pkg/server"
	"github.com/sst/ion/pkg/telemetry"
)

var version = "dev"

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
		slog.Info("interrupted")
		cancel()
	}()
	c, err := cli.New(ctx, cancel, root, version)
	if err != nil {
		c.PrintHelp()
		return err
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
	return c.Run()
}

var root = &cli.Command{
	Name: "sst",
	Description: cli.Description{
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
			"To install a specific version.",
			"",
			"```bash \"VERSION=0.0.403\"",
			"curl -fsSL https://ion.sst.dev/install | VERSION=0.0.403 bash",
			"```",
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
	Flags: []cli.Flag{
		{
			Name: "stage",
			Type: "string",
			Description: cli.Description{
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
			Description: cli.Description{
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
			Description: cli.Description{
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
	Children: []*cli.Command{
		{
			Name: "init",
			Description: cli.Description{
				Short: "Initialize a new project",
				Long: strings.Join([]string{
					"Initialize a new project in the current directory. This will create a `sst.config.ts` and `sst install` your providers.",
					"",
					"If this is run in a Next.js, Remix, Astro, or SvelteKit project, it'll init SST in drop-in mode.",
				}, "\n"),
			},
			Run: CmdInit,
		},
		{
			Name:   "mosaic",
			Hidden: true,
			Run:    mosaic.CmdMosaic,
		},
		{
			Name:   "mosaic-deploy",
			Hidden: true,
			Run:    mosaic.CmdMosaicDeploy,
		},
		{
			Name: "dev",
			Description: cli.Description{
				Short: "Run in development mode",
				Long: strings.Join([]string{
					"Run your app in development mode.",
					"",
					"```bash frame=\"none\"",
					"sst dev",
					"```",
					"",
					"Optionally, pass in a command to start your frontend as well.",
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
					"2. Watches your `sst.config.ts` and re-deploys changes",
					"3. Run your functions [Live](/docs/live/)",
					"4. Skip components that should be run locally",
					"   - `Service`",
					"   - Frontends like, `Nextjs`, `Remix`, `Astro`, `SvelteKit`, etc.",
					"5. If you pass in a `command`, it'll:",
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
			Flags: []cli.Flag{
				{
					Name: "silent",
					Type: "bool",
					Description: cli.Description{
						Short: "Don't show function invocation logs",
						Long:  "Don't show logs from function invocations",
					},
				},
			},
			Args: []cli.Argument{
				{
					Name: "command",
					Description: cli.Description{
						Short: "The command to run",
					},
				},
			},
			Examples: []cli.Example{
				{
					Content: "sst dev",
					Description: cli.Description{
						Short: "",
					},
				},
				{
					Content: "sst dev next dev",
					Description: cli.Description{
						Short: "Start dev mode for SST and Next.js",
					},
				},
				{
					Content: "sst dev \"next dev --turbo\"",
					Description: cli.Description{
						Short: "When passing flags wrap command in quotes",
					},
				},
			},
			Run: CmdDev,
		},
		{
			Name: "deploy",
			Description: cli.Description{
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
			Flags: []cli.Flag{
				{
					Name: "target",
					Description: cli.Description{
						Short: "Comma seperated list of target URNs",
						Long:  "Comma seperated list of target URNs.",
					},
				},
			},
			Examples: []cli.Example{
				{
					Content: "sst deploy --stage=production",
					Description: cli.Description{
						Short: "Deploy to production",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				p, err := c.InitProject()
				if err != nil {
					return err
				}
				defer p.Cleanup()

				ui := ui.New(c.Context, ui.ProgressModeDeploy)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				target := []string{}
				if c.String("target") != "" {
					target = strings.Split(c.String("target"), ",")
				}
				err = p.Stack.Run(c.Context, &project.StackInput{
					Command: "deploy",
					OnEvent: ui.StackEvent,
					Target:  target,
				})
				if err != nil {
					return err
				}
				return nil
			},
		},
		{
			Name: "add",
			Description: cli.Description{
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
			Args: []cli.Argument{
				{
					Name:     "provider",
					Required: true,
					Description: cli.Description{
						Short: "The provider to add",
						Long:  "The provider to add.",
					},
				},
			},
			Run: func(cli *cli.Cli) error {
				pkg := cli.Positional(0)
				spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
				spin.Suffix = "  Adding provider..."
				spin.Start()
				defer spin.Stop()
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}
				stage, err := cli.Stage(cfgPath)
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
			Description: cli.Description{
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
			Run: func(cli *cli.Cli) error {
				cfgPath, err := project.Discover()
				if err != nil {
					return err
				}

				stage, err := cli.Stage(cfgPath)
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
			Description: cli.Description{
				Short: "Manage secrets",
				Long:  "Manage the secrets in your app defined with `sst.Secret`.",
			},
			Children: []*cli.Command{
				{
					Name: "set",
					Description: cli.Description{
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
					Args: []cli.Argument{
						{
							Name:     "name",
							Required: true,
							Description: cli.Description{
								Short: "The name of the secret",
								Long:  "The name of the secret.",
							},
						},
						{
							Name:     "value",
							Required: false,
							Description: cli.Description{
								Short: "The value of the secret",
								Long:  "The value of the secret.",
							},
						},
					},
					Examples: []cli.Example{
						{
							Content: "sst secret set StripeSecret 123456789",
							Description: cli.Description{
								Short: "Set the StripeSecret to 123456789",
							},
						},
						{
							Content: "sst secret set StripeSecret < tmp.txt",
							Description: cli.Description{
								Short: "Set the StripeSecret to contents of tmp.txt",
							},
						},
						{
							Content: "sst secret set StripeSecret productionsecret --stage=production",
							Description: cli.Description{
								Short: "Set the StripeSecret in production",
							},
						},
					},
					Run: CmdSecretSet,
				},
				{
					Name: "load",
					Description: cli.Description{
						Short: "Set multiple secrets from file",
						Long: strings.Join([]string{
							"Load all the secrets from a file and set them.",
							"",
							"```bash frame=\"none\"",
							"sst secret load ./secrets.env",
							"```",
							"",
							"The file needs to be in the _dotenv_ or bash format of key-value pairs.",
							"",
							"```sh title=\"secrets.env\"",
							"KEY_1=VALUE1",
							"KEY_2=VALUE2",
							"```",
							"",
							"Optionally, set the secrets in a specific stage.",
							"",
							"```bash frame=\"none\"",
							"sst secret load ./prod.env --stage=production",
							"```",
							"",
							"",
						}, "\n"),
					},
					Args: []cli.Argument{
						{
							Name:     "file",
							Required: true,
							Description: cli.Description{
								Short: "The file to load secrets from",
								Long:  "The file to load the secrets from.",
							},
						},
					},
					Examples: []cli.Example{
						{
							Content: "sst secret load ./secrets.env",
							Description: cli.Description{
								Short: "Loads all secrets from the file",
							},
						},
						{
							Content: "sst secret load ./prod.env --stage=production",
							Description: cli.Description{
								Short: "Set secrets for production",
							},
						},
					},
					Run: CmdSecretLoad,
				},
				{
					Name: "remove",
					Description: cli.Description{
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
					Args: []cli.Argument{
						{
							Name:     "name",
							Required: true,
							Description: cli.Description{
								Short: "The name of the secret",
								Long:  "The name of the secret.",
							},
						},
					},
					Examples: []cli.Example{
						{
							Content: "sst secret remove StripeSecret",
							Description: cli.Description{
								Short: "Remove the StripeSecret",
							},
						},
						{
							Content: "sst secret remove StripeSecret --stage=production",
							Description: cli.Description{
								Short: "Remove the StripeSecret in production",
							},
						},
					},
					Run: func(c *cli.Cli) error {
						key := c.Positional(0)
						p, err := c.InitProject()
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
						addr, _ := server.GetExisting(p.PathConfig(), p.App().Stage)
						if addr != "" {
							http.Post("http://"+addr+"/api/deploy", "application/json", strings.NewReader("{}"))
						}
						ui.Success(fmt.Sprintf("Removed \"%s\" for stage \"%s\"", key, p.App().Stage))
						return nil
					},
				},
				{
					Name: "list",
					Description: cli.Description{
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
					Examples: []cli.Example{
						{
							Content: "sst secret list --stage=production",
							Description: cli.Description{
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
			Args: []cli.Argument{
				{
					Name: "command",
					Description: cli.Description{
						Short: "A command to run",
						Long:  "A command to run.",
					},
				},
			},
			Description: cli.Description{
				Short: "Run a command with linked resources",
				Long: strings.Join([]string{
					"Run a command with **all the resources linked** to the environment. This is useful for running scripts against your infrastructure.",
					"",
					"For example, let's say you have the following resources in your app.",
					"",
					"```js title=\"sst.config.ts\" {5,9}",
					"new sst.aws.Bucket(\"MyMainBucket\");",
					"new sst.aws.Bucket(\"MyAdminBucket\");",
					"```",
					"",
					"We can now write a script that'll can access both these resources with the [JS SDK](/docs/reference/sdk/).",
					"",
					"```js title=\"my-script.js\" \"Resource.MyMainBucket.name\" \"Resource.MyAdminBucket.name\"",
					"import { Resource } from \"sst\";",
					"",
					"console.log(Resource.MyMainBucket.name, Resource.MyAdminBucket.name);",
					"```",
					"",
					"And run the script with `sst shell`.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst shell node my-script.js",
					"```",
					"",
					"This'll have access to all the buckets from above.",
					"",
					":::tip",
					"Run the command with `--` to pass arguments to it.",
					":::",
					"",
					"To pass arguments into the script, you'll need to prefix it using `--`.",
					"",
					"```bash frame=\"none\" frame=\"none\" /--(?!a)/",
					"sst shell -- node my-script.js --arg1 --arg2",
					"```",
					"",
					"If no command is passed in, it opens a shell session with the linked resources.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst shell",
					"```",
					"",
					"This is useful if you want to run multiple commands, all while accessing the resources in your app.",
				}, "\n"),
			},
			Examples: []cli.Example{
				{
					Content: "sst shell",
					Description: cli.Description{
						Short: "Open a shell session",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				p, err := c.InitProject()
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
				for _, arg := range c.Arguments() {
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
				// Get the environment variables
				envs := os.Environ()

				// Filter the environment variables to exclude AWS_PROFILE
				filteredEnvs := make([]string, 0, len(envs))
				for _, val := range envs {
					if !strings.HasPrefix(val, "AWS_PROFILE=") {
						filteredEnvs = append(filteredEnvs, val)
					}
				}
				cmd.Env = append(cmd.Env,
					filteredEnvs...,
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
				cmd.Env = append(cmd.Env, fmt.Sprintf(`SST_RESOURCE_App={"name": "%s", "stage": "%s" }`, p.App().Name, p.App().Stage))

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
			Description: cli.Description{
				Short: "Remove your application",
				Long: strings.Join([]string{
					"Removes your application. By default, it removes your personal stage.",
					"",
					":::tip",
					"The resources in your app are removed based on the `removal` setting in your `sst.config.ts`.",
					":::",
					"",
					"This does not remove the SST _state_ and _bootstrap_ resources in your account as these might still be in use by other apps. You can remove them manually if you want to reset your account, [learn more](docs/providers/#state).",
					"",
					"Optionally, remove your app from a specific stage.",
					"",
					"```bash frame=\"none\" frame=\"none\"",
					"sst remove --stage=production",
					"```",
				}, "\n"),
			},
			Flags: []cli.Flag{
				{
					Name: "target",
					Type: "string",
					Description: cli.Description{
						Short: "Comma seperated list of target URNs",
						Long:  "Comma seperated list of target URNs.",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				p, err := c.InitProject()
				if err != nil {
					return err
				}
				defer p.Cleanup()
				ui := ui.New(c.Context, ui.ProgressModeRemove)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				target := []string{}
				if c.String("target") != "" {
					target = strings.Split(c.String("target"), ",")
				}
				err = p.Stack.Run(c.Context, &project.StackInput{
					Command: "remove",
					OnEvent: ui.StackEvent,
					Target:  target,
				})
				if err != nil {
					return err
				}
				return nil
			},
		},
		{
			Name: "unlock",
			Description: cli.Description{
				Short: "Clear any locks on the app state",
				Long: strings.Join([]string{
					"When you run `sst deploy`, it acquires a lock on your state file to prevent concurrent deploys.",
					"",
					"However, if something unexpectedly kills the `sst deploy` process, or if you manage to run `sst deploy` concurrently, the lock might not be released.",
					"",
					"This should not usually happen, but it can prevent you from deploying. You can run `sst unlock` to release the lock.",
				}, "\n"),
			},
			Run: func(c *cli.Cli) error {
				p, err := c.InitProject()
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
			Description: cli.Description{
				Short: "Print the version of the CLI",
				Long:  `Prints the current version of the CLI.`,
			},
			Run: func(cli *cli.Cli) error {
				fmt.Println(version)
				return nil
			},
		},
		{
			Name: "upgrade",
			Description: cli.Description{
				Short: "Upgrade the CLI",
				Long: strings.Join([]string{
					"Upgrade the CLI to the latest version. Or optionally, pass in a version to upgrade to.",
					"",
					"```bash frame=\"none\"",
					"sst upgrade 0.10",
					"```",
				}, "\n"),
			},
			Args: cli.ArgumentList{
				{
					Name: "version",
					Description: cli.Description{
						Short: "A version to upgrade to",
						Long:  "A version to upgrade to.",
					},
				},
			},
			Run: func(cli *cli.Cli) error {
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
			Name: "telemetry", Description: cli.Description{
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
			Children: []*cli.Command{
				{
					Name: "enable",
					Description: cli.Description{
						Short: "Enable telemetry",
						Long:  "Enable telemetry.",
					},
					Run: func(cli *cli.Cli) error {
						return telemetry.Enable()
					},
				},
				{
					Name: "disable",
					Description: cli.Description{
						Short: "Disable telemetry",
						Long:  "Disable telemetry.",
					},
					Run: func(cli *cli.Cli) error {
						return telemetry.Disable()
					},
				},
			},
		},
		{
			Name:   "import-unstable",
			Hidden: true,
			Description: cli.Description{
				Short: "(unstable)Import existing resource",
			},
			Args: []cli.Argument{
				{
					Name:     "type",
					Required: true,
					Description: cli.Description{
						Short: "The type of the resource",
					},
				},
				{
					Name:     "name",
					Required: true,
					Description: cli.Description{
						Short: "The name of the resource",
					},
				},
				{
					Name:     "id",
					Required: true,
					Description: cli.Description{
						Short: "The id of the resource",
					},
				},
			},
			Flags: []cli.Flag{
				{
					Type: "string",
					Name: "parent",
					Description: cli.Description{
						Short: "The parent resource",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				resourceType := c.Positional(0)
				name := c.Positional(1)
				id := c.Positional(2)
				parent := c.String("parent")

				p, err := c.InitProject()
				if err != nil {
					return err
				}
				defer p.Cleanup()

				err = p.Stack.Import(c.Context, &project.ImportOptions{
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
			Run: func(c *cli.Cli) error {
				project, err := c.InitProject()
				if err != nil {
					return err
				}
				defer project.Cleanup()

				s, err := server.New(project)
				if err != nil {
					return err
				}

				err = s.Start(c.Context)
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
			Run: func(cli *cli.Cli) error {
				data, err := json.MarshalIndent(cli.Path()[0], "", "  ")
				if err != nil {
					return err
				}
				fmt.Println(string(data))
				return nil
			},
		},
		{
			Name: "refresh",
			Description: cli.Description{
				Short: "Refresh the local app state",
				Long: strings.Join([]string{
					"Compares your local state with the state of the resources in the cloud provider. Any changes that are found are adopted into your local state. It will:",
					"",
					"1. Go through every single resource in your state.",
					"2. Make a call to the cloud provider to check the resource.",
					"   - If the configs are different, it'll **update the state** to reflect the change.",
					"   - If the resource doesn't exist anymore, it'll **remove it from the state**.",
					"",
					":::note",
					"The `sst refresh` does not make changes to the resources in the cloud provider.",
					":::",
					"",
					"This is useful for cases where you want to ensure that your local state is in sync with your cloud provider. [Learn more about how state works](/docs/providers/#how-state-works).",
				}, "\n"),
			},
			Flags: []cli.Flag{
				{
					Name: "target",
					Type: "string",
					Description: cli.Description{
						Short: "Comma seperated list of target URNs",
						Long:  "Comma seperated list of target URNs.",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				p, err := c.InitProject()
				if err != nil {
					return err
				}
				defer p.Cleanup()
				ui := ui.New(c.Context, ui.ProgressModeRefresh)
				defer ui.Destroy()
				ui.Header(version, p.App().Name, p.App().Stage)
				target := []string{}
				if c.String("target") != "" {
					target = strings.Split(c.String("target"), ",")
				}
				err = p.Stack.Run(c.Context, &project.StackInput{
					Command: "refresh",
					OnEvent: ui.StackEvent,
					Target:  target,
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
			Description: cli.Description{
				Short: "Manage state of your deployment",
			},
			Children: []*cli.Command{
				{
					Name: "edit",
					Description: cli.Description{
						Short: "Edit the state of your deployment",
					},
					Run: func(c *cli.Cli) error {
						p, err := c.InitProject()
						if err != nil {
							return err
						}
						defer p.Cleanup()

						var parsed provider.Summary
						parsed.Version = version
						parsed.UpdateID = cuid2.Generate()
						parsed.TimeStarted = time.Now().UTC().Format(time.RFC3339)
						err = p.Stack.Lock(parsed.UpdateID, "edit")
						if err != nil {
							return util.NewReadableError(err, "Could not lock state")
						}
						defer p.Stack.Unlock()
						defer func() {
							parsed.TimeCompleted = time.Now().UTC().Format(time.RFC3339)
							provider.PutSummary(p.Backend(), p.App().Name, p.App().Stage, parsed.UpdateID, parsed)
						}()

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

						return p.Stack.PushState(parsed.UpdateID)
					},
				},
			},
		},
	},
}
