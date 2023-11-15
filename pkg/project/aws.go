package project

import (
	"context"
	"log/slog"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
)

func (p *Project) GetAwsCredentials() (*aws.Credentials, error) {
	if p.credentials != nil && !p.credentials.Expired() {
		return p.credentials, nil
	}
	slog.Info("using", "profile", p.Profile())
	ctx := context.Background()
	slog.Info("getting aws credentials")
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithSharedConfigProfile(p.Profile()),
	)
	if err != nil {
		return nil, err
	}
	credentials, err := cfg.Credentials.Retrieve(ctx)
	if err != nil {
		return nil, err
	}
	p.credentials = &credentials
	slog.Info("credentials found")
	return &credentials, nil
}
