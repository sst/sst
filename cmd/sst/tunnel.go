package main

import (
	"log/slog"
	"os"
	"os/exec"
	"os/user"
	"strings"
	"syscall"

	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/tunnel"
	"golang.org/x/sync/errgroup"
)

var CmdTunnel = &cli.Command{
	Name: "tunnel",
	Description: cli.Description{
		Short: "",
		Long:  strings.Join([]string{}, "\n"),
	},
	Run: func(c *cli.Cli) error {
		proj, err := c.InitProject()
		if err != nil {
			return err
		}
		_, err = proj.GetCompleted(c.Context)
		if err != nil {
			return err
		}
		// run as root
		tunnelCmd := exec.Command("sudo", "/opt/sst/sst", "tunnel", "start")
		tunnelCmd.Stdout = os.Stdout
		tunnelCmd.Stderr = os.Stderr
		tunnelCmd.Start()
		<-c.Context.Done()
		tunnelCmd.Process.Signal(syscall.SIGINT)
		tunnelCmd.Wait()
		return nil
	},
	Children: []*cli.Command{
		{
			Name: "install",
			Description: cli.Description{
				Short: "Install the tunnel",
				Long: strings.Join([]string{
					"Install the tunnel.",
					"",
					"This will install the tunnel on your system.",
					"",
					"This is required for the tunnel to work.",
				}, "\n"),
			},
			Run: func(c *cli.Cli) error {
				currentUser, err := user.Current()
				if err != nil {
					return err
				}
				if currentUser.Uid != "0" {
					return util.NewReadableError(nil, "You need to run this command as root")
				}
				err = tunnel.Install()
				if err != nil {
					return err
				}
				ui.Success("Tunnel installed successfully.")
				return nil
			},
		},
		{
			Name: "start",
			Description: cli.Description{
				Short: "Start the tunnel",
				Long: strings.Join([]string{
					"Start the tunnel.",
					"",
					"This will start the tunnel.",
					"",
					"This is required for the tunnel to work.",
				}, "\n"),
			},
			Hidden: true,
			Args: []cli.Argument{
				{
					Name: "subnet",
					Description: cli.Description{
						Short: "The subnet to use for the tunnel",
						Long:  "The subnet to use for the tunnel",
					},
					Required: true,
				},
				{
					Name: "host",
					Description: cli.Description{
						Short: "The host to use for the tunnel",
						Long:  "The host to use for the tunnel",
					},
					Required: true,
				},
				{
					Name: "port",
					Description: cli.Description{
						Short: "The port to use for the tunnel",
						Long:  "The port to use for the tunnel",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				err := global.EnsureTun2Socks()
				if err != nil {
					return err
				}
				subnet := c.Positional(0)
				host := c.Positional(1)
				port := c.Positional(2)
				slog.Info("starting tunnel", "subnet", subnet, "host", host, "port", port)
				if port == "" {
					port = "22"
				}
				var wg errgroup.Group
				wg.Go(func() error {
					defer c.Cancel()
					return tunnel.StartProxy(c.Context, host+":"+port, []byte(os.Getenv("SSH_PRIVATE_KEY")))
				})
				wg.Go(func() error {
					defer c.Cancel()
					return tunnel.Start(c.Context, subnet)
				})
				slog.Info("tunnel started")
				wg.Wait()
				return nil
			},
		},
	},
}
