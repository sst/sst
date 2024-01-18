import path from "path";
import {
  ComponentResourceOptions,
  Input,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component } from "./component.js";
import { Postgres } from "./postgres.js";
import { EmbeddingsTable } from "./providers/embeddings-table.js";
import { Function, FunctionPermissionArgs } from "./function.js";
import { AWSLinkable, Link, Linkable } from "./link.js";
import { VisibleError } from "./error.js";

const ModelInfo = {
  "amazon.titan-embed-text-v1": { provider: "bedrock" as const, size: 1536 },
  "amazon.titan-embed-image-v1": { provider: "bedrock" as const, size: 1024 },
  "text-embedding-ada-002": { provider: "openai" as const, size: 1536 },
};

export interface VectorArgs {
  /**
   * The embedding model to use for generating vectors
   * @default Titan Multimodal Embeddings G1
   */
  model?: Input<keyof typeof ModelInfo>;
}

export class Vector extends Component implements Linkable, AWSLinkable {
  private ingestHandler: Function;
  private retrieveHandler: Function;
  private removeHandler: Function;

  constructor(
    name: string,
    args?: VectorArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Vector", name, args, opts);

    const parent = this;
    const model = normalizeModel();
    const vectorSize = normalizeVectorSize();
    const databaseName = normalizeDatabaseName();
    const tableName = normalizeTableName();

    const postgres = createDB();
    createDBTable();
    const ingestHandler = createIngestHandler();
    const retrieveHandler = createRetrieveHandler();
    const removeHandler = createRemoveHandler();

    this.ingestHandler = ingestHandler;
    this.retrieveHandler = retrieveHandler;
    this.removeHandler = removeHandler;

    function normalizeModel() {
      return output(args?.model).apply((model) => {
        model = model ?? "amazon.titan-embed-image-v1";
        if (!ModelInfo[model]) throw new Error(`Invalid model: ${model}`);
        if (
          ModelInfo[model].provider === "openai" &&
          !process.env.OPENAI_API_KEY
        ) {
          throw new VisibleError(
            `Please pass in the OPENAI_API_KEY via environment variable to use the ${model} model. You can get your API keys here: https://platform.openai.com/api-keys`
          );
        }
        return model;
      });
    }

    function normalizeVectorSize() {
      return model.apply((model) => ModelInfo[model].size);
    }

    function normalizeDatabaseName() {
      return $app.stage;
    }

    function normalizeTableName() {
      return "embeddings";
    }

    function createDB() {
      return new Postgres(`${name}Database`, {}, { parent });
    }

    function createDBTable() {
      // Create table after the DB instance is created
      postgres.nodes.instance.arn.apply(() => {
        new EmbeddingsTable(
          `${name}Table`,
          {
            clusterArn: postgres.nodes.cluster.arn,
            secretArn: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
            databaseName,
            tableName,
            vectorSize,
          },
          { parent }
        );
      });
    }

    function createIngestHandler() {
      return new Function(
        `${name}Ingestor`,
        {
          description:
            "Vector handler for ingesting data and generating embeddings",
          handler: buildHandlerPath("ingest"),
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent }
      );
    }

    function createRetrieveHandler() {
      return new Function(
        `${name}Retriever`,
        {
          description: "Vector handler for retrieving related embeddings",
          handler: buildHandlerPath("retrieve"),
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent }
      );
    }

    function createRemoveHandler() {
      return new Function(
        `${name}Remover`,
        {
          description: "Vector handler for removing embeddings",
          handler: buildHandlerPath("remove"),
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent }
      );
    }

    function buildHandlerPath(functionName: string) {
      return path.resolve(
        __dirname,
        "..",
        "src",
        "components",
        "handlers",
        "vector-handler",
        `index.${functionName}`
      );
    }

    function buildHandlerEnvironment() {
      return model.apply((model) => ({
        CLUSTER_ARN: postgres.nodes.cluster.arn,
        SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
        MODEL: model,
        DATABASE_NAME: databaseName,
        TABLE_NAME: tableName,
        MODEL_PROVIDER: ModelInfo[model].provider,
        ...(ModelInfo[model].provider === "openai"
          ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
          : {}),
      }));
    }

    function buildHandlerPermissions() {
      return [
        {
          actions: ["bedrock:InvokeModel"],
          resources: [
            interpolate`arn:aws:bedrock:us-east-1::foundation-model/${model}`,
          ],
        },
        {
          actions: ["secretsmanager:GetSecretValue"],
          resources: [postgres.nodes.cluster.masterUserSecrets[0].secretArn],
        },
        {
          actions: ["rds-data:ExecuteStatement"],
          resources: [postgres.nodes.cluster.arn],
        },
      ];
    }
  }

  public getSSTLink(): Link {
    return {
      type: `{ ingestorFunctionName: string, retrieverFunctionName: string }`,
      value: {
        ingestorFunctionName: this.ingestHandler.nodes.function.name,
        retrieverFunctionName: this.retrieveHandler.nodes.function.name,
        removerFunctionName: this.removeHandler.nodes.function.name,
      },
    };
  }

  public getSSTAWSPermissions(): FunctionPermissionArgs {
    return {
      actions: ["lambda:InvokeFunction"],
      resources: [
        this.ingestHandler.nodes.function.arn,
        this.retrieveHandler.nodes.function.arn,
        this.removeHandler.nodes.function.arn,
      ],
    };
  }
}
