package project

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/ssm/types"
	"github.com/google/uuid"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type bootstrap struct {
	project *Project
	bucket  string
	sync.Once
}

const SSM_NAME_BUCKET = "/sst/bootstrap"

func (b *bootstrap) Bucket() (string, error) {
	var createErr error

	b.Do(func() {
		ctx := context.TODO()
		cfg, err := b.project.AWS.Config()
		if err != nil {
			createErr = err
			return
		}

		ssmClient := ssm.NewFromConfig(cfg)
		slog.Info("fetching bootstrap bucket")
		result, err := ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
			Name:           aws.String(SSM_NAME_BUCKET),
			WithDecryption: aws.Bool(false),
		})

		if result != nil && result.Parameter.Value != nil {
			slog.Info("found existing bootstrap bucket", "bucket", *result.Parameter.Value)
			b.bucket = *result.Parameter.Value
			return
		}

		if err != nil {
			var pnf *types.ParameterNotFound
			if errors.As(err, &pnf) {
				bucketName := fmt.Sprintf("sst-bootstrap-%v-%v", uuid.New().String(), b.project.Region())
				slog.Info("creating bootstrap bucket", "name", bucketName)
				s3Client := s3.NewFromConfig(cfg)

				_, err := s3Client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
					Bucket: aws.String(bucketName),
				})
				if err != nil {
					createErr = err
					return
				}

				_, err = ssmClient.PutParameter(
					ctx,
					&ssm.PutParameterInput{
						Name:  aws.String(SSM_NAME_BUCKET),
						Type:  types.ParameterTypeString,
						Value: aws.String(bucketName),
					},
				)
				if err != nil {
					createErr = err
					return
				}

				b.bucket = bucketName
				return
			}
			createErr = err
			return
		}

	})
	if createErr != nil {
		return "", createErr
	}
	return b.bucket, nil
}
