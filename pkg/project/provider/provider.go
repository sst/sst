package provider

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/sst/ion/internal/util"

	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	ssmTypes "github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

type Backend interface {
	Init(workdir string, provider map[string]string) error
	Lock(app string, stage string) error
	Unlock(app string, stage string) error
	Cancel(app string, stage string) error
	Url() string
	Env() (map[string]string, error)
}

type Provider interface {
	Init(provider map[string]string) (map[string]string, error)
}

type AwsProvider struct {
	workdir     string
	args        map[string]string
	config      aws.Config
	bucket      string
	credentials sync.Once
}

const SSM_NAME_BUCKET = "/sst/bootstrap"

type LockExistsError struct{}

func (e *LockExistsError) Error() string {
	return "Lock exists"
}

func (a *AwsProvider) Url() string {
	// return fmt.Sprintf("s3://%v", a.bucket)
	return fmt.Sprintf("file://%v", a.workdir)
}

func (a *AwsProvider) Lock(app string, stage string) error {
	slog.Info("locking", "app", app, "stage", stage)
	s3Client := s3.NewFromConfig(a.config)

	lockKey := a.remoteLockFor(app, stage)
	_, err := s3Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(lockKey),
	})

	if err == nil {
		slog.Info("lock exists", "key", lockKey)
		return &LockExistsError{}
	}

	slog.Info("writing lock")
	_, err = s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(lockKey),
	})
	if err != nil {
		return err
	}

	slog.Info("syncing old state")
	result, err := s3Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(a.remoteStateFor(app, stage)),
	})

	if err == nil {
		err := os.RemoveAll(
			filepath.Join(
				a.workdir,
				".pulumi",
			),
		)
		if err != nil {
			return err
		}

		err = os.MkdirAll(filepath.Dir(a.localStateFor(app, stage)), 0755)
		if err != nil {
			return err
		}
		file, err := os.Create(a.localStateFor(app, stage))
		if err != nil {
			return err
		}
		defer file.Close()
		if _, err := io.Copy(file, result.Body); err != nil {
			return err
		}

	}

	return nil
}

func (a *AwsProvider) localStateFor(app string, stage string) string {
	return filepath.Join(a.workdir, ".pulumi", "stacks", app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) remoteStateFor(app string, stage string) string {
	return filepath.Join("state", "data", app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) remoteLockFor(app string, stage string) string {
	return filepath.Join("state", "lock", app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) Unlock(app string, stage string) error {
	slog.Info("unlocking", "app", app, "stage", stage)
	s3Client := s3.NewFromConfig(a.config)
	defer func() {
		s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
			Bucket: aws.String(a.bucket),
			Key:    aws.String(a.remoteLockFor(app, stage)),
		})
	}()

	file, err := os.Open(a.localStateFor(app, stage))
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(a.remoteStateFor(app, stage)),
		Body:   file,
	})
	if err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) Cancel(app string, stage string) error {
	slog.Info("canceling", "app", app, "stage", stage)
	s3Client := s3.NewFromConfig(a.config)

	_, err := s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(a.remoteLockFor(app, stage)),
	})
	if err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) Env() (map[string]string, error) {
	creds, err := a.config.Credentials.Retrieve(context.Background())
	if err != nil {
		return nil, err
	}

	env := map[string]string{}
	env["AWS_ACCESS_KEY_ID"] = creds.AccessKeyID
	env["AWS_SECRET_ACCESS_KEY"] = creds.SecretAccessKey
	env["AWS_SESSION_TOKEN"] = creds.SessionToken
	env["AWS_DEFAULT_REGION"] = a.config.Region

	return env, nil
}

func (a *AwsProvider) Init(workdir string, args map[string]string) (err error) {
	a.args = args
	a.workdir = workdir

	cfg, err := a.resolveConfig()
	if err != nil {
		return err
	}
	if cfg.Region == "" {
		cfg.Region = "us-east-1"
	}
	a.config = cfg

	bucket, err := a.resolveBucket()
	if err != nil {
		return err
	}
	a.bucket = bucket

	creds, err := cfg.Credentials.Retrieve(context.TODO())
	if err != nil {
		return err
	}
	delete(args, "profile")
	if creds.AccessKeyID != "" {
		args["accessKey"] = creds.AccessKeyID
	}

	if creds.SecretAccessKey != "" {
		args["secretKey"] = creds.SecretAccessKey
	}
	if creds.SessionToken != "" {
		args["token"] = creds.SessionToken
	}
	if cfg.Region != "" {
		args["region"] = cfg.Region
	}

	return err
}

func (a *AwsProvider) resolveBucket() (string, error) {
	ctx := context.TODO()

	ssmClient := ssm.NewFromConfig(a.config)
	slog.Info("fetching bootstrap bucket")
	result, err := ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(SSM_NAME_BUCKET),
		WithDecryption: aws.Bool(false),
	})

	if result != nil && result.Parameter.Value != nil {
		slog.Info("found existing bootstrap bucket", "bucket", *result.Parameter.Value)
		return *result.Parameter.Value, nil
	}

	if err != nil {
		var pnf *ssmTypes.ParameterNotFound
		if errors.As(err, &pnf) {
			region := a.config.Region
			bucketName := fmt.Sprintf("sst--%v", util.RandomString(12))
			slog.Info("creating bootstrap bucket", "name", bucketName)
			s3Client := s3.NewFromConfig(a.config)

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
				return "", err
			}

			_, err = s3Client.PutBucketNotificationConfiguration(context.TODO(), &s3.PutBucketNotificationConfigurationInput{
				Bucket:                    aws.String(bucketName),
				NotificationConfiguration: &s3types.NotificationConfiguration{},
			})
			if err != nil {
				return "", err
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
				return "", err
			}

			return bucketName, nil
		}
		return "", err
	}

	panic("unreachable")
}

func (a *AwsProvider) resolveConfig() (aws.Config, error) {
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(
		ctx,
		func(lo *config.LoadOptions) error {
			if a.args["profile"] != "" {
				lo.SharedConfigProfile = a.args["profile"]
			}
			if a.args["region"] != "" {
				lo.Region = a.args["region"]
				lo.DefaultRegion = "us-east-1"
			}
			return nil
		},
	)
	if err != nil {
		return aws.Config{}, err
	}
	_, err = cfg.Credentials.Retrieve(ctx)
	if err != nil {
		return aws.Config{}, err
	}
	slog.Info("credentials found")
	return cfg, nil
}
