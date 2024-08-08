package scrap

import (
	"context"
	"net/rpc"
	"time"

	"github.com/sst/ion/pkg/project"
)

type Scrap struct {
}

func (r *Scrap) Run(input int, output *int) error {
	time.Sleep(time.Minute * 10)
	*output = input + 1
	return nil
}

func Register(ctx context.Context, p *project.Project, r *rpc.Server) error {
	r.RegisterName("Scrap", &Scrap{})
	return nil
}
