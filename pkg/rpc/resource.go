package rpc

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/project/provider"
)

type CreateResult[T any] struct {
	ID   string `json:"id"`
	Outs T      `json:"outs"`
}

type DeleteInput[T any] struct {
	ID   string `json:"id"`
	Outs T      `json:"outs"`
}

type UpdateInput[N any, O any] struct {
	ID   string `json:"id"`
	News N      `json:"news"`
	Olds O      `json:"olds"`
}

type AwsResource struct {
	context context.Context
	project *project.Project
}

func (a *AwsResource) config() (aws.Config, error) {
	result, ok := a.project.Provider("aws")
	if !ok {
		return aws.Config{}, fmt.Errorf("no aws provider found")
	}
	casted := result.(*provider.AwsProvider)
	return casted.Config(), nil
}
