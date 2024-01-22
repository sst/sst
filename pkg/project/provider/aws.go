package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/sst/ion/internal/util"

	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	ssmTypes "github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

type AwsProvider struct {
	args        map[string]string
	config      aws.Config
	bucket      string
	credentials sync.Once
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

func (a *AwsProvider) Lock(app string, stage string, out *os.File) error {
	slog.Info("locking", "app", app, "stage", stage)
	s3Client := s3.NewFromConfig(a.config)

	lockKey := a.pathForLock(app, stage)
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
		Key:    aws.String(a.pathForState(app, stage)),
	})

	if err != nil {
		var nsk *s3types.NoSuchKey
		if errors.As(err, &nsk) {
			_, err := io.Copy(out, bytes.NewReader([]byte("{}")))
			return err
		}
		return err
	}

	if _, err := io.Copy(out, result.Body); err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) pathForData(key, app, stage string) string {
	return filepath.Join("state", key, app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) pathForState(app string, stage string) string {
	return filepath.Join("state", "data", app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) pathForLock(app string, stage string) string {
	return filepath.Join("state", "lock", app, fmt.Sprintf("%v.json", stage))
}

func (a *AwsProvider) pathForPassphrase(app string, stage string) string {
	return "/" + strings.Join([]string{"sst", "passphrase", app, stage}, "/")
}

func (a *AwsProvider) Unlock(app string, stage string, in *os.File) error {
	s3Client := s3.NewFromConfig(a.config)
	defer func() {
		s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
			Bucket: aws.String(a.bucket),
			Key:    aws.String(a.pathForLock(app, stage)),
		})
	}()

	_, err := s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(a.bucket),
		Key:         aws.String(a.pathForState(app, stage)),
		ContentType: aws.String("application/json"),
		Body:        in,
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
		Key:    aws.String(a.pathForLock(app, stage)),
	})
	if err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) Init(app string, stage string, args map[string]string) (err error) {
	a.args = args

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

	tags, err := json.Marshal(map[string]interface{}{
		"tags": map[string]string{
			"sst:app":   app,
			"sst:stage": stage,
		},
	})
	if err != nil {
		return err
	}
	args["defaultTags"] = string(tags)

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

func (a *AwsProvider) getData(key, app, stage string) (io.Reader, error) {
	s3Client := s3.NewFromConfig(a.config)

	result, err := s3Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(a.pathForData(key, app, stage)),
	})

	if err != nil {
		var nsk *s3types.NoSuchKey
		if errors.As(err, &nsk) {
			return nil, nil
		}
		return nil, err
	}
	return result.Body, nil
}

func (a *AwsProvider) putData(key, app, stage string, data io.Reader) error {
	s3Client := s3.NewFromConfig(a.config)

	_, err := s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(a.bucket),
		Key:         aws.String(a.pathForData(key, app, stage)),
		Body:        data,
		ContentType: aws.String("application/json"),
	})
	if err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) getPassphrase(app string, stage string) (string, error) {
	ssmClient := ssm.NewFromConfig(a.config)

	result, err := ssmClient.GetParameter(context.TODO(), &ssm.GetParameterInput{
		Name:           aws.String(a.pathForPassphrase(app, stage)),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		pnf := &ssmTypes.ParameterNotFound{}
		if errors.As(err, &pnf) {
			return "", nil
		}

		return "", err
	}
	return *result.Parameter.Value, nil
}

func (a *AwsProvider) setPassphrase(app, stage, passphrase string) error {
	ssmClient := ssm.NewFromConfig(a.config)

	_, err := ssmClient.PutParameter(context.TODO(), &ssm.PutParameterInput{
		Name:      aws.String(a.pathForPassphrase(app, stage)),
		Type:      ssmTypes.ParameterTypeSecureString,
		Value:     aws.String(passphrase),
		Overwrite: aws.Bool(false),
	})
	return err
}
