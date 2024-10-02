package tunnel

import (
	"context"
	"fmt"
	"net"

	"github.com/armon/go-socks5"
	"golang.org/x/crypto/ssh"
)

func StartProxy(ctx context.Context, ip string, key []byte) error {
	signer, err := ssh.ParsePrivateKey(key)
	if err != nil {
		return err
	}
	config := &ssh.ClientConfig{
		User: "ec2-user",
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}
	sshClient, err := ssh.Dial("tcp", ip, config)
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
	errChan := make(chan error, 1)
	go func() {
		err := server.ListenAndServe("tcp", fmt.Sprintf("%s:%d", "127.0.0.1", 1080))
		errChan <- err
	}()
	select {
	case err := <-errChan:
		return err
	case <-ctx.Done():
		return nil
	}
}
