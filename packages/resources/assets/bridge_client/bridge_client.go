package main

import (
	"log"
	"net"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/pion/stun"
)

var conn, bridge, self = (func() (*net.UDPConn, *net.UDPAddr, string) {
	local, _ := net.ResolveUDPAddr("udp", ":6060")
	bridge, _ := net.ResolveUDPAddr("udp", os.Getenv("SST_DEBUG_BRIDGE"))
	conn, _ := net.ListenUDP("udp", local)
	log.Println("Listening...")
	self := discover(conn)
	log.Println("Self:", self)
	go func() {
		for {
			conn.WriteToUDP([]byte("png"), bridge)
			time.Sleep(time.Second * 1)
		}
	}()

	return conn, bridge, self
})()

func discover(conn *net.UDPConn) string {
	server, _ := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)
	conn.WriteToUDP(message.Raw, server)
	for {
		buf := make([]byte, 1024)

		n, _, _ := conn.ReadFromUDP(buf)
		buf = buf[:n]
		if stun.IsMessage(buf) {
			m := new(stun.Message)
			m.Raw = buf
			decErr := m.Decode()
			if decErr != nil {
				log.Println("decode:", decErr)
				break
			}
			var xorAddr stun.XORMappedAddress
			if getErr := xorAddr.GetFrom(m); getErr != nil {
				panic("Failed to get NAT address")
			}
			return xorAddr.String()
		}
	}
	panic("Failed to get NAT address")
}

func Handler(request interface{}) (interface{}, error) {
	log.Println("from", self, "to", bridge)
	conn.WriteToUDP([]byte("req:Hello"), bridge)
	for {
		buffer := make([]byte, 1024)
		read, _ := conn.Read(buffer)
		if read == 0 {
			continue
		}
		msg := string(buffer[:read])
		if !strings.HasPrefix(msg, "rsp") {
			continue
		}
		return msg, nil
	}

}

func main() {
	lambda.Start(Handler)
}
