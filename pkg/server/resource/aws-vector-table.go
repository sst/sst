package resource

import (
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/rdsdata"
)

type VectorTable struct {
	*AwsResource
}

type VectorTableInputs struct {
	ClusterArn   string `json:"clusterArn"`
	SecretArn    string `json:"secretArn"`
	DatabaseName string `json:"databaseName"`
	TableName    string `json:"tableName"`
	Dimension    int    `json:"dimension"`
}

type VectorTableOutputs struct {
	Dimension int `json:"dimension"`
}

func (r *VectorTable) Create(input *VectorTableInputs, output *CreateResult[VectorTableOutputs]) error {
	if err := r.createDatabase(input); err != nil {
		return err
	}
	if err := r.enablePgvectorExtension(input); err != nil {
		return err
	}
	if err := r.enablePgtrgmExtension(input); err != nil {
		return err
	}
	if err := r.createTable(input); err != nil {
		return err
	}
	if err := r.createEmbeddingIndex(input); err != nil {
		return err
	}
	if err := r.createMetadataIndex(input); err != nil {
		return err
	}

	*output = CreateResult[VectorTableOutputs]{
		ID:   input.TableName,
		Outs: VectorTableOutputs{Dimension: input.Dimension},
	}
	return nil
}

func (r *VectorTable) Update(input *UpdateInput[VectorTableInputs, VectorTableOutputs], output *UpdateResult[VectorTableOutputs]) error {
	if err := r.createDatabase(&input.News); err != nil {
		return err
	}
	if err := r.enablePgvectorExtension(&input.News); err != nil {
		return err
	}
	if err := r.enablePgtrgmExtension(&input.News); err != nil {
		return err
	}
	if input.Olds.Dimension != input.News.Dimension {
		if err := r.removeTable(&input.News); err != nil {
			return err
		}
	}
	if err := r.createTable(&input.News); err != nil {
		return err
	}
	if err := r.createEmbeddingIndex(&input.News); err != nil {
		return err
	}
	if err := r.createMetadataIndex(&input.News); err != nil {
		return err
	}

	*output = UpdateResult[VectorTableOutputs]{
		Outs: VectorTableOutputs{Dimension: input.News.Dimension},
	}
	return nil
}

func (r *VectorTable) createDatabase(input *VectorTableInputs) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	client := rdsdata.NewFromConfig(cfg)

	_, err = client.ExecuteStatement(r.context, &rdsdata.ExecuteStatementInput{
		ResourceArn: &input.ClusterArn,
		SecretArn:   &input.SecretArn,
		Sql:         stringPtr(fmt.Sprintf("create database %s", input.DatabaseName)),
	})
	if err != nil {
		if !strings.Contains(err.Error(), "SQLState: 42P04") {
			return err
		}
	}
	return nil
}

func (r *VectorTable) enablePgvectorExtension(input *VectorTableInputs) error {
	return r.executeSQL(input, "create extension vector;")
}

func (r *VectorTable) enablePgtrgmExtension(input *VectorTableInputs) error {
	return r.executeSQL(input, "create extension pg_trgm;")
}

func (r *VectorTable) createTable(input *VectorTableInputs) error {
	sql := fmt.Sprintf(`create table %s (
		id bigserial primary key,
		embedding vector(%d),
		metadata jsonb
	);`, input.TableName, input.Dimension)
	return r.executeSQL(input, sql)
}

func (r *VectorTable) removeTable(input *VectorTableInputs) error {
	sql := fmt.Sprintf("drop table if exists %s;", input.TableName)
	return r.executeSQL(input, sql)
}

func (r *VectorTable) createEmbeddingIndex(input *VectorTableInputs) error {
	sql := fmt.Sprintf("create index on %s using hnsw (embedding vector_cosine_ops);", input.TableName)
	return r.executeSQL(input, sql)
}

func (r *VectorTable) createMetadataIndex(input *VectorTableInputs) error {
	sql := fmt.Sprintf("create index on %s using gin (metadata);", input.TableName)
	return r.executeSQL(input, sql)
}

func (r *VectorTable) executeSQL(input *VectorTableInputs, sql string) error {
	cfg, err := r.config()
	if err != nil {
		return err
	}
	client := rdsdata.NewFromConfig(cfg)

	_, err = client.ExecuteStatement(r.context, &rdsdata.ExecuteStatementInput{
		ResourceArn: &input.ClusterArn,
		SecretArn:   &input.SecretArn,
		Database:    &input.DatabaseName,
		Sql:         &sql,
	})
	if err != nil {
		if !strings.Contains(err.Error(), "SQLState: 42710") && !strings.Contains(err.Error(), "SQLState: 42P07") {
			return err
		}
	}
	return nil
}

func stringPtr(s string) *string {
	return &s
}

