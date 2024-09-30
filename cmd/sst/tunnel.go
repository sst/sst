package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"os/user"
	"runtime"
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
	"github.com/vishvananda/netlink"
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
		err := global.EnsureTun2Socks()
		if err != nil {
			return err
		}
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
				sourcePath, err := os.Executable()
				if err != nil {
					return err
				}
				os.MkdirAll("/opt/sst", 0755)
				destPath := "/opt/sst/sst"
				sourceFile, err := os.Open(sourcePath)
				if err != nil {
					return err
				}
				defer sourceFile.Close()
				destFile, err := os.Create(destPath)
				if err != nil {
					return err
				}
				defer destFile.Close()
				_, err = io.Copy(destFile, sourceFile)
				if err != nil {
					return err
				}
				err = os.Chmod(destPath, 0755)
				sudoersPath := "/etc/sudoers.d/sst"
				command := destPath + " tunnel start"
				sudoersEntry := fmt.Sprintf("%s ALL=(ALL) NOPASSWD: %s\n", currentUser.Username, command)
				err = os.WriteFile(sudoersPath, []byte(sudoersEntry), 0440)
				if err != nil {
					return err
				}
				var cmd *exec.Cmd
				if runtime.GOOS == "darwin" {
					cmd = exec.Command("visudo", "-cf", sudoersPath)
				} else {
					cmd = exec.Command("visudo", "-c", "-f", sudoersPath)
				}
				err = cmd.Run()
				if err != nil {
					os.Remove(sudoersPath)
					return util.NewReadableError(err, "Error validating sudoers file")
				}

				ui.Success("Sudoers entry added successfully.")
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
			Run: func(c *cli.Cli) error {
				slog.Info("creating interface")
				tun := &netlink.Tuntap{
					LinkAttrs: netlink.LinkAttrs{Name: "sst"},
					Mode:      netlink.TUNTAP_MODE_TUN,
				}
				err := netlink.LinkAdd(tun)
				if err != nil {
					return err
				}
				defer func() {
					slog.Info("deleting interface")
					netlink.LinkDel(tun)
				}()
				link, err := netlink.LinkByName(tun.Name)
				if err != nil {
					return err
				}
				slog.Info("bringing up interface")
				err = netlink.LinkSetUp(link)
				if err != nil {
					return err
				}
				slog.Info("assigning address")
				addr, err := netlink.ParseAddr("172.16.0.0/12")
				if err != nil {
					return err
				}
				err = netlink.AddrAdd(link, addr)
				if err != nil {
					return err
				}
				route := &netlink.Route{
					LinkIndex: link.Attrs().Index,
					Scope:     netlink.SCOPE_UNIVERSE,
					Dst: &net.IPNet{
						IP:   net.IPv4(10, 0, 0, 0),
						Mask: net.IPv4Mask(255, 0, 0, 0),
					},
					Gw: net.IPv4(0, 0, 0, 0),
				}
				netlink.RouteAdd(route)
				defer netlink.RouteDel(route)
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
