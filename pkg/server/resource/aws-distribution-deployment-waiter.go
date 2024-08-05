package resource

import (
	"log/slog"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
)

type DistributionDeploymentWaiter struct {
	*AwsResource
}

type DistributionDeploymentWaiterInputs struct {
	DistributionId string `json:"distributionId"`
	Etag           string `json:"etag"`
	Wait           bool   `json:"wait"`
}

type DistributionDeploymentWaiterOutputs struct {
	IsDone bool `json:"isDone"`
}

func (r *DistributionDeploymentWaiter) Create(input *DistributionDeploymentWaiterInputs, output *CreateResult[DistributionDeploymentWaiterOutputs]) error {
	if err := r.handle(input); err != nil {
		return err
	}
	*output = CreateResult[DistributionDeploymentWaiterOutputs]{
		ID:   "waiter",
		Outs: DistributionDeploymentWaiterOutputs{IsDone: true},
	}
	return nil
}

func (r *DistributionDeploymentWaiter) Update(input *UpdateInput[DistributionDeploymentWaiterInputs, DistributionDeploymentWaiterOutputs], output *UpdateResult[DistributionDeploymentWaiterOutputs]) error {
	if err := r.handle(&input.News); err != nil {
		return err
	}
	*output = UpdateResult[DistributionDeploymentWaiterOutputs]{
		Outs: DistributionDeploymentWaiterOutputs{IsDone: true},
	}
	return nil
}

func (r *DistributionDeploymentWaiter) handle(input *DistributionDeploymentWaiterInputs) error {
	if !input.Wait {
		return nil
	}

	cfg, err := r.config()
	if err != nil {
		return err
	}
	client := cloudfront.NewFromConfig(cfg)

	start := time.Now()
	timeout := 5 * time.Minute

	for {
		result, err := client.GetDistribution(r.context, &cloudfront.GetDistributionInput{
			Id: aws.String(input.DistributionId),
		})
		if err != nil {
			return err
		}

		if result.Distribution != nil && result.Distribution.Status != nil && *result.Distribution.Status == "Deployed" {
			return nil
		}

		if time.Since(start) > timeout {
			slog.Info("Distribution deployment waiter timed out after 5 minutes")
			return nil
		}

		time.Sleep(5 * time.Second)
	}
}

