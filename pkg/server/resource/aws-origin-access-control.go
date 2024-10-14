package resource

import (
	"errors"
	"log/slog"
	"math/rand"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront/types"
)

type OriginAccessControl struct {
	*AwsResource
}

type OriginAccessControlInputs struct {
	Name string `json:"name"`
}

type OriginAccessControlOutputs struct {
}

func (r *OriginAccessControl) Read(input *DeleteInput[OriginAccessControlOutputs], output *ReadResult[OriginAccessControlOutputs]) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	cf := cloudfront.NewFromConfig(cfg)
	
	resp, err := cf.GetOriginAccessControl(r.context, &cloudfront.GetOriginAccessControlInput{
		Id: aws.String(input.ID),
	})
	if err != nil {
		var alreadyExistsErr *types.NoSuchOriginAccessControl
		if errors.As(err, &alreadyExistsErr) {
			*output = ReadResult[OriginAccessControlOutputs]{}
			return nil
		}
		return err
	}

	*output = ReadResult[OriginAccessControlOutputs]{
		ID: *resp.OriginAccessControl.Id,
		Outs: OriginAccessControlOutputs{},
	}
	return nil
}
func (r *OriginAccessControl) Create(input *OriginAccessControlInputs, output *CreateResult[OriginAccessControlOutputs]) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	cf := cloudfront.NewFromConfig(cfg)
	slog.Info("creating origin access control")
	resp, err := cf.CreateOriginAccessControl(r.context, &cloudfront.CreateOriginAccessControlInput{
		OriginAccessControlConfig: &types.OriginAccessControlConfig{
			Name: 												 aws.String(generateName(input.Name)),
			Description:									 aws.String("Created by SST"),
			OriginAccessControlOriginType: "s3",
			SigningBehavior:							 "always",
			SigningProtocol:							 "sigv4",
		},
	})
	if err != nil {
		return err
	}
	*output = CreateResult[OriginAccessControlOutputs]{
		ID:   *resp.OriginAccessControl.Id,
		Outs: OriginAccessControlOutputs{},
	}
	return nil
}

func (r *OriginAccessControl) Delete(input *DeleteInput[OriginAccessControlOutputs], output *int) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	cf := cloudfront.NewFromConfig(cfg)
	resp, err := cf.GetOriginAccessControl(r.context, &cloudfront.GetOriginAccessControlInput{
		Id: aws.String(input.ID),
	})
	if err != nil {
		return err
	}
	_, err = cf.DeleteOriginAccessControl(r.context, &cloudfront.DeleteOriginAccessControlInput{
		Id:      aws.String(input.ID),
		IfMatch: resp.ETag,
	})
	if err != nil {
		return err
	}
	return nil
}

func generateName(name string) string {
	// Truncate the name to 55 characters
	if len(name) > 55 {
		name = name[:55]
	}

	// Append a random 8 character
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, 8)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}

	return name + "-" + string(result)
}
