package resource

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/lambda/types"
)

type FunctionCodeUpdater struct {
	*AwsResource
}

type FunctionCodeUpdaterInputs struct {
	S3Bucket             string `json:"s3Bucket"`
	S3Key                string `json:"s3Key"`
	FunctionName         string `json:"functionName"`
	FunctionLastModified string `json:"functionLastModified"`
	Region               string `json:"region"`
	ImageUri             string `json:"imageUri"`
}

type FunctionCodeUpdaterOutputs struct {
	Version string `json:"version"`
}

func (r *FunctionCodeUpdater) Create(input *FunctionCodeUpdaterInputs, output *CreateResult[FunctionCodeUpdaterOutputs]) error {
	version, err := r.updateCode(input)
	if err != nil {
		return err
	}

	if err := r.waitForUpdate(input); err != nil {
		return err
	}

	*output = CreateResult[FunctionCodeUpdaterOutputs]{
		ID:   input.FunctionName,
		Outs: FunctionCodeUpdaterOutputs{Version: version},
	}
	return nil
}

func (r *FunctionCodeUpdater) Update(input *UpdateInput[FunctionCodeUpdaterInputs, FunctionCodeUpdaterOutputs], output *UpdateResult[FunctionCodeUpdaterOutputs]) error {
	version, err := r.updateCode(&input.News)
	if err != nil {
		return err
	}

	if err := r.waitForUpdate(&input.News); err != nil {
		return err
	}

	*output = UpdateResult[FunctionCodeUpdaterOutputs]{
		Outs: FunctionCodeUpdaterOutputs{Version: version},
	}
	return nil
}

func (r *FunctionCodeUpdater) updateCode(input *FunctionCodeUpdaterInputs) (string, error) {
	cfg, err := r.config()
	if err != nil {
		return "", err
	}

	cfg.Region = input.Region
	client := lambda.NewFromConfig(cfg)

	// Handle the case where the function is deployed in a container
	if input.ImageUri != "" {
		ret, err := client.UpdateFunctionCode(r.context, &lambda.UpdateFunctionCodeInput{
			FunctionName: aws.String(input.FunctionName),
			ImageUri:     aws.String(input.ImageUri),
		})
		if err != nil {
			slog.Error("failed to update function code", "error", err, "imageUri", input.ImageUri)
			return "", err
		}

		if ret.Version != nil {
			return *ret.Version, nil
		}
		return "unknown", nil
	}

	ret, err := client.UpdateFunctionCode(r.context, &lambda.UpdateFunctionCodeInput{
		FunctionName: aws.String(input.FunctionName),
		S3Bucket:     aws.String(input.S3Bucket),
		S3Key:        aws.String(input.S3Key),
	})
	if err != nil {
		return "", err
	}

	if ret.Version != nil {
		return *ret.Version, nil
	}
	return "unknown", nil
}

func (r *FunctionCodeUpdater) waitForUpdate(input *FunctionCodeUpdaterInputs) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}

	cfg.Region = input.Region
	client := lambda.NewFromConfig(cfg)

	for {
		ret, err := client.GetFunction(r.context, &lambda.GetFunctionInput{
			FunctionName: aws.String(input.FunctionName),
		})
		if err != nil {
			return err
		}

		if ret.Configuration.LastUpdateStatus == types.LastUpdateStatusSuccessful {
			return nil
		}

		if ret.Configuration.LastUpdateStatus == types.LastUpdateStatusFailed {
			reason := "Unknown"
			if ret.Configuration.LastUpdateStatusReason != nil {
				reason = *ret.Configuration.LastUpdateStatusReason
			}
			return fmt.Errorf("failed to update function %s: %s", ret.Configuration.LastUpdateStatusReasonCode, reason)
		}

		time.Sleep(300 * time.Millisecond)
	}
}

