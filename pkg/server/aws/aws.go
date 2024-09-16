package aws

import (
	"context"
	"fmt"
	"net/rpc"
	"sync"

	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
)

type aws struct {
	project        *project.Project
	bootstrapCache map[string]*provider.AwsBootstrapData
	lock           sync.RWMutex
}

type BootstrapInput struct {
	Region string `json:"region"`
}

func (a *aws) Bootstrap(input *BootstrapInput, output *provider.AwsBootstrapData) error {
	a.lock.RLock()
	cached, ok := a.bootstrapCache[input.Region]
	a.lock.RUnlock()
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
	a.lock.Lock()
	a.bootstrapCache[input.Region] = data
	a.lock.Unlock()
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
