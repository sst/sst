package rpc

import (
	"context"
	"io"
	"net/http"
	gorpc "net/rpc"
	"net/rpc/jsonrpc"

	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server"
)

type MathService struct{}

func (m *MathService) Multiply(args *Args, reply *int) error {
	*reply = args.A * args.B
	return nil
}

type Args struct {
	A int `json:"a"`
	B int `json:"b"`
}

func Start(ctx context.Context, p *project.Project, server *server.Server) error {
	serve := gorpc.NewServer()
	serve.RegisterName("math", new(MathService))

	awsResource := AwsResource{ctx, p}

	serve.RegisterName("Resource.Aws.OriginAccessIdentity", &OriginAccessIdentity{&awsResource})

	server.Mux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		serve.ServeCodec(jsonrpc.NewServerCodec(&HttpConn{Reader: r.Body, Writer: w}))
	})
	<-ctx.Done()
	return nil
}

type HttpConn struct {
	io.Reader
	io.Writer
}

func (c *HttpConn) Close() error { return nil }
