package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"os/user"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/armon/go-socks5"
	"github.com/songgao/water"
	"github.com/sst/ion/cmd/sst/cli"
	"github.com/sst/ion/cmd/sst/mosaic/ui"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/tunnel"
	"golang.org/x/crypto/ssh"
)

type WaterTun struct {
	*water.Interface
}

func (w *WaterTun) Name() (string, error) {
	return w.Interface.Name(), nil
}

func (w *WaterTun) File() *os.File {
	return nil
}

const (
	MTU = 1500
)

type connection struct {
	conn       net.Conn
	lastActive time.Time
}

var (
	connectionsMutex sync.Mutex
	connections      = make(map[string]*connection)
)

var CmdTunnel = &cli.Command{
	Name: "tunnel",
	Description: cli.Description{
		Short: "",
		Long:  strings.Join([]string{}, "\n"),
	},
	Run: func(c *cli.Cli) error {
		// run as root
		tunnelCmd := exec.Command("sudo", "/opt/sst/sst", "tunnel", "start", "--print-logs")
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
			Flags: []cli.Flag{
				{
					Name: "print-logs",
					Type: "bool",
					Description: cli.Description{
						Short: "Print logs to stderr",
						Long:  "Print the logs to the screen. These are logs that are written to the `.sst/log/tun2socks.log` file.",
					},
				},
			},
			Run: func(c *cli.Cli) error {
				err := global.EnsureTun2Socks()
				if err != nil {
					return err
				}
				slog.Info("creating interface")
				err = tunnel.CreateInterface(
					"10.0.4.0/22",
					"10.0.12.0/22",
					"10.0.0.0/22",
					"10.0.8.0/22",
				)
				if err != nil {
					return err
				}
				defer tunnel.DestroyInterface()
				slog.Info("getting ssh key")
				key, err := os.ReadFile("/home/thdxr/.ssh/id_rsa")
				if err != nil {
					return err
				}
				signer, err := ssh.ParsePrivateKey(key)
				if err != nil {
					return err
				}
				// ssh -vvv -D 1080 -N ec2-user@54.89.220.51
				config := &ssh.ClientConfig{
					User: "ec2-user",
					Auth: []ssh.AuthMethod{
						ssh.PublicKeys(signer),
					},
					HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				}
				sshClient, err := ssh.Dial("tcp", "54.89.220.51:22", config)
				if err != nil {
					return err
				}
				defer sshClient.Close()

				server, err := socks5.New(&socks5.Config{
					Dial: func(ctx context.Context, network, addr string) (net.Conn, error) {
						fmt.Println("Dialing", network, addr)
						// 50/50 random
						if true {
							return sshClient.Dial(network, addr)
						}
						return net.Dial(network, addr)
					},
				})
				if err != nil {
					return err
				}
				go server.ListenAndServe("tcp", fmt.Sprintf("%s:%d", "127.0.0.1", 1080))
				slog.Info("tunnel started")

				socksCmd := exec.CommandContext(c.Context, "tun2socks", "-device", "sst", "-proxy", "socks5://127.0.0.1:1080")
				socksCmd.Stdout = os.Stdout
				socksCmd.Stderr = os.Stderr
				socksCmd.Start()
				<-c.Context.Done()
				socksCmd.Process.Kill()
				socksCmd.Wait()
				return nil
			},
		},
	},
}
