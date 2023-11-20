package project

import (
	"context"
	"log/slog"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
)

type projectAws struct {
	project *Project
	cfg     aws.Config
	sync.Once
}

func (p *projectAws) Credentials() (*aws.Credentials, error) {
	cfg, err := p.Config()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	creds, err := cfg.Credentials.Retrieve(ctx)
	if err != nil {
		return nil, err
	}
	return &creds, nil
}

func (p *projectAws) Config() (aws.Config, error) {
	var err error

	p.Do(func() {
		slog.Info("using", "profile", p.project.Profile())
		ctx := context.Background()
		slog.Info("getting aws credentials")
		cfg, e := config.LoadDefaultConfig(
			ctx,
			config.WithSharedConfigProfile(p.project.Profile()),
			func(lo *config.LoadOptions) error {
				lo.Region = p.project.Region()
				return nil
			},
		)
		if e != nil {
			err = e
			return
		}
		_, e = cfg.Credentials.Retrieve(ctx)
		if e != nil {
			err = e
			return
		}
		slog.Info("credentials found")
		p.cfg = cfg
	})

	if err != nil {
		return aws.Config{}, err
	}

	return p.cfg, nil
}
