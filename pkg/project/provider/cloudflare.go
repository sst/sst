package provider

import (
	"context"

	"github.com/sst/ion/internal/util"
)

type CloudflareProvider struct {
}

func (c *CloudflareProvider) Init(app string, stage string, args map[string]string) error {
	return nil
}

func (a *CloudflareProvider) Dev(ctx context.Context, app, stage string, events chan string) (util.CleanupFunc, error) {
	return func() error {
		return nil
	}, nil
}
