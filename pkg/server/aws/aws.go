package aws

import (
	"context"
	"fmt"
	"net/rpc"

	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
)

type aws struct {
	project        *project.Project
	bootstrapCache map[string]*provider.AwsBootstrapData
}

type BootstrapInput struct {
	Region string `json:"region"`
}

func (a *aws) Bootstrap(input *BootstrapInput, output *provider.AwsBootstrapData) error {
	cached, ok := a.bootstrapCache[input.Region]
	if ok {
		*output = *cached
		return nil
	}
	unknown, ok := a.project.Provider("aws")
	if !ok {
		return fmt.Errorf("aws provider not found")
	}
	existing := unknown.(*provider.AwsProvider)
	cfg := existing.Config()
	cfg.Region = input.Region
	data, err := provider.AwsBootstrap(cfg)
	if err != nil {
		return err
	}
	a.bootstrapCache[input.Region] = data
	*output = *data
	return nil
}

func Register(ctx context.Context, p *project.Project, r *rpc.Server) error {
	r.RegisterName("Provider.Aws", &aws{
		project:        p,
		bootstrapCache: map[string]*provider.AwsBootstrapData{},
	})
	return nil
}
