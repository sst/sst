package rpc

import (
	"log/slog"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront/types"
)

type OriginAccessIdentity struct {
	*AwsResource
}

type OriginAccessIdentityInputs struct {
}

type OriginAccessIdentityOutputs struct {
}

func (r *OriginAccessIdentity) Create(input *OriginAccessIdentityInputs, output *CreateResult[OriginAccessIdentityOutputs]) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	cf := cloudfront.NewFromConfig(cfg)
	slog.Info("creating origin access identity")
	resp, err := cf.CreateCloudFrontOriginAccessIdentity(r.context, &cloudfront.CreateCloudFrontOriginAccessIdentityInput{
		CloudFrontOriginAccessIdentityConfig: &types.CloudFrontOriginAccessIdentityConfig{
			CallerReference: aws.String(time.Now().String()),
			Comment:         aws.String("Created by SST"),
		},
	})
	if err != nil {
		return err
	}
	*output = CreateResult[OriginAccessIdentityOutputs]{
		ID:   *resp.CloudFrontOriginAccessIdentity.Id,
		Outs: OriginAccessIdentityOutputs{},
	}
	return nil
}

func (r *OriginAccessIdentity) Delete(input *DeleteInput[OriginAccessIdentityOutputs], output *int) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	cf := cloudfront.NewFromConfig(cfg)
	resp, err := cf.GetCloudFrontOriginAccessIdentity(r.context, &cloudfront.GetCloudFrontOriginAccessIdentityInput{
		Id: aws.String(input.ID),
	})
	if err != nil {
		return err
	}
	_, err = cf.DeleteCloudFrontOriginAccessIdentity(r.context, &cloudfront.DeleteCloudFrontOriginAccessIdentityInput{
		Id:      aws.String(input.ID),
		IfMatch: resp.ETag,
	})
	if err != nil {
		return err
	}
	return nil
}
