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

const VectorSizeMapping = {
  "amazon.titan-embed-text-v1": 1536,
  "amazon.titan-embed-image-v1": 1024,
};

export interface VectorArgs {
  /**
   * The embedding model to use for generating vectors
   * @default Titan Multimodal Embeddings G1
   */
  model?: Input<"amazon.titan-embed-text-v1" | "amazon.titan-embed-image-v1">;
}

export class Vector extends Component implements Linkable, AWSLinkable {
  private ingestHandler: Function;
  private retrieveHandler: Function;

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

    this.ingestHandler = ingestHandler;
    this.retrieveHandler = retrieveHandler;

    function normalizeModel() {
      return output(args?.model).apply(
        (model) => model ?? "amazon.titan-embed-image-v1"
      );
    }

    function normalizeVectorSize() {
      return model.apply((model) => {
        if (!(model in VectorSizeMapping)) {
          throw new Error(`Invalid model: ${model}`);
        }
        return VectorSizeMapping[model];
      });
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
          handler: path.resolve(
            __dirname,
            "..",
            "src",
            "components",
            "functions",
            "vector-handler",
            "index.ingest"
          ),
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
          handler: path.resolve(
            __dirname,
            "..",
            "src",
            "components",
            "functions",
            "vector-handler",
            "index.retrieve"
          ),
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent }
      );
    }

    function buildHandlerEnvironment() {
      return {
        CLUSTER_ARN: postgres.nodes.cluster.arn,
        SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
        EMBEDDING_MODEL_ID: model,
        DATABASE_NAME: databaseName,
        TABLE_NAME: tableName,
      };
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
      },
    };
  }

  public getSSTAWSPermissions(): FunctionPermissionArgs {
    return {
      actions: ["lambda:InvokeFunction"],
      resources: [
        this.ingestHandler.nodes.function.arn,
        this.retrieveHandler.nodes.function.arn,
      ],
    };
  }
}
