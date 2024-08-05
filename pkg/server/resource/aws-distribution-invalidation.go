package resource

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront/types"
)

const (
	FILE_LIMIT     = 3000
	WILDCARD_LIMIT = 15
)

type DistributionInvalidation struct {
	*AwsResource
}

type DistributionInvalidationInputs struct {
	DistributionId string   `json:"distributionId"`
	Paths          []string `json:"paths"`
	Wait           bool     `json:"wait"`
	Version        string   `json:"version"`
}

func (r *DistributionInvalidation) Create(input *DistributionInvalidationInputs, output *CreateResult[struct{}]) error {
	if err := r.handle(input); err != nil {
		return err
	}
	*output = CreateResult[struct{}]{
		ID: "invalidation",
	}
	return nil
}

func (r *DistributionInvalidation) Update(input *UpdateInput[DistributionInvalidationInputs, struct{}], output *UpdateResult[struct{}]) error {
	if err := r.handle(&input.News); err != nil {
		return err
	}
	*output = UpdateResult[struct{}]{}
	return nil
}

func (r *DistributionInvalidation) handle(input *DistributionInvalidationInputs) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	client := cloudfront.NewFromConfig(cfg)

	ids, err := r.invalidate(client, input)
	if err != nil {
		return err
	}

	if input.Wait {
		return r.waitForInvalidation(client, input, ids)
	}
	return nil
}

func (r *DistributionInvalidation) invalidate(client *cloudfront.Client, input *DistributionInvalidationInputs) ([]string, error) {
	var pathsFile, pathsWildcard []string
	for _, path := range input.Paths {
		if strings.TrimSpace(path)[len(path)-1:] == "*" {
			pathsWildcard = append(pathsWildcard, path)
		} else {
			pathsFile = append(pathsFile, path)
		}
	}

	stepsCount := int(math.Max(
		math.Ceil(float64(len(pathsFile))/FILE_LIMIT),
		math.Ceil(float64(len(pathsWildcard))/WILDCARD_LIMIT),
	))

	var invalidationIds []string
	for i := 0; i < stepsCount; i++ {
		start, end := i*FILE_LIMIT, (i+1)*FILE_LIMIT
		if end > len(pathsFile) {
			end = len(pathsFile)
		}
		stepPaths := append(pathsFile[start:end], pathsWildcard[i*WILDCARD_LIMIT:int(math.Min(float64((i+1)*WILDCARD_LIMIT), float64(len(pathsWildcard))))]...)

		id, err := r.invalidateChunk(client, input.DistributionId, stepPaths)
		if err != nil {
			return nil, err
		}
		invalidationIds = append(invalidationIds, id)
	}

	return invalidationIds, nil
}

func (r *DistributionInvalidation) invalidateChunk(client *cloudfront.Client, distributionId string, paths []string) (string, error) {
	result, err := client.CreateInvalidation(r.context, &cloudfront.CreateInvalidationInput{
		DistributionId: aws.String(distributionId),
		InvalidationBatch: &types.InvalidationBatch{
			CallerReference: aws.String(strconv.FormatInt(time.Now().UnixNano(), 10)),
			Paths: &types.Paths{
				Quantity: aws.Int32(int32(len(paths))),
				Items:    paths,
			},
		},
	})
	if err != nil {
		return "", err
	}

	if result.Invalidation == nil || result.Invalidation.Id == nil {
		return "", fmt.Errorf("Invalidation ID not found")
	}

	return *result.Invalidation.Id, nil
}

func (r *DistributionInvalidation) waitForInvalidation(client *cloudfront.Client, input *DistributionInvalidationInputs, invalidationIds []string) error {
	for _, invalidationId := range invalidationIds {
		waiter := cloudfront.NewInvalidationCompletedWaiter(client)
		err := waiter.Wait(r.context, &cloudfront.GetInvalidationInput{
			DistributionId: aws.String(input.DistributionId),
			Id:             aws.String(invalidationId),
		}, 10*time.Minute)
		if err != nil {
			// Suppress errors
			// log.Printf("Error waiting for invalidation: %v", err)
		}
	}
	return nil
}

