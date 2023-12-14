package provider

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/google/uuid"

	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	ssmTypes "github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

type Backend interface {
	Backend(provider map[string]string) (string, error)
}

type Provider interface {
	Init(provider map[string]string) (map[string]string, error)
}

type AwsProvider struct {
	config      aws.Config
	credentials sync.Once
}

const SSM_NAME_BUCKET = "/sst/bootstrap"

func (a *AwsProvider) Backend(provider map[string]string) (string, map[string]string, error) {
	ctx := context.TODO()
	env := map[string]string{}
	cfg, err := a.resolveConfig(provider)
	if err != nil {
		return "", nil, err
	}

	creds, err := cfg.Credentials.Retrieve(ctx)
	if err != nil {
		return "", nil, err
	}

	env["AWS_ACCESS_KEY_ID"] = creds.AccessKeyID
	env["AWS_SECRET_ACCESS_KEY"] = creds.SecretAccessKey
	env["AWS_SESSION_TOKEN"] = creds.SessionToken
	env["AWS_DEFAULT_REGION"] = cfg.Region

	ssmClient := ssm.NewFromConfig(cfg)
	slog.Info("fetching bootstrap bucket")
	result, err := ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(SSM_NAME_BUCKET),
		WithDecryption: aws.Bool(false),
	})

	if result != nil && result.Parameter.Value != nil {
		slog.Info("found existing bootstrap bucket", "bucket", *result.Parameter.Value)
		return *result.Parameter.Value, env, nil
	}

	if err != nil {
		var pnf *ssmTypes.ParameterNotFound
		if errors.As(err, &pnf) {
			region := cfg.Region
			bucketName := fmt.Sprintf("sst-bootstrap-%v", uuid.New().String())
			slog.Info("creating bootstrap bucket", "name", bucketName)
			s3Client := s3.NewFromConfig(cfg)

			var config *s3types.CreateBucketConfiguration = nil
			if region != "us-east-1" {
				config = &s3types.CreateBucketConfiguration{
					LocationConstraint: s3types.BucketLocationConstraint(region),
				}
			}
			_, err := s3Client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
				Bucket:                    aws.String(bucketName),
				CreateBucketConfiguration: config,
			})
			if err != nil {
				return "", nil, err
			}

			_, err = s3Client.PutBucketNotificationConfiguration(context.TODO(), &s3.PutBucketNotificationConfigurationInput{
				Bucket: aws.String(bucketName),
			})
			if err != nil {
				return "", nil, err
			}

			_, err = ssmClient.PutParameter(
				ctx,
				&ssm.PutParameterInput{
					Name:  aws.String(SSM_NAME_BUCKET),
					Type:  ssmTypes.ParameterTypeString,
					Value: aws.String(bucketName),
				},
			)
			if err != nil {
				return "", nil, err
			}

			return bucketName, env, nil
		}
		return "", nil, err
	}

	panic("unreachable")
}

func (a *AwsProvider) Init(provider map[string]string) (err error) {
	// return nil
	cfg, err := a.resolveConfig(provider)
	if err != nil {
		return err
	}
	creds, err := cfg.Credentials.Retrieve(context.TODO())
	if err != nil {
		return err
	}
	delete(provider, "profile")
	if creds.AccessKeyID != "" {
		provider["accessKey"] = creds.AccessKeyID
	}

	if creds.SecretAccessKey != "" {
		provider["secretKey"] = creds.SecretAccessKey
	}
	if creds.SessionToken != "" {
		provider["token"] = creds.SessionToken
	}
	if cfg.Region != "" {
		provider["region"] = cfg.Region
	}

	return err
}

func (a *AwsProvider) resolveConfig(provider map[string]string) (aws.Config, error) {
	var finalErr error
	a.credentials.Do(func() {
		ctx := context.Background()
		cfg, err := config.LoadDefaultConfig(
			ctx,
			func(lo *config.LoadOptions) error {
				if provider["profile"] != "" {
					lo.SharedConfigProfile = provider["profile"]
				}
				if provider["region"] != "" {
					lo.Region = provider["region"]
				}
				return nil
			},
		)
		if err != nil {
			finalErr = err
			return
		}
		_, err = cfg.Credentials.Retrieve(ctx)
		if err != nil {
			finalErr = err
			return
		}
		slog.Info("credentials found")
		a.config = cfg
	})

	return a.config, finalErr

}
