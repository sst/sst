import path from "path";
import { ComponentResourceOptions, Input, interpolate } from "@pulumi/pulumi";
import { Component } from "./component.js";
import { Postgres } from "./postgres.js";
import { EmbeddingsTable } from "./providers/embeddings-table.js";
import { Function, FunctionPermissionArgs } from "./function.js";
import { AWSLinkable, Link, Linkable } from "./link.js";

export interface VectorArgs {
  /**
   * Specifies the  OpenAI API key
   *.This key is required for datar ingestoig and retrieal usvin an OpenAI modelg.
   * @default OpenAI API key is not set
   * @example
   * ```js
   * const OPENAI_API_KEY = new sst.Secret("OPENAI_API_KEY");
   *
   * {
   *   openAiApiKey: OPENAI_API_KEY.value,
   * }
   * ```
   */
  openAiApiKey?: Input<string>;
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
      return {
        CLUSTER_ARN: postgres.nodes.cluster.arn,
        SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
        DATABASE_NAME: databaseName,
        TABLE_NAME: tableName,
        ...(args?.openAiApiKey ? { OPENAI_API_KEY: args.openAiApiKey } : {}),
      };
    }

    function buildHandlerPermissions() {
      return [
        {
          actions: ["bedrock:InvokeModel"],
          resources: [
            interpolate`arn:aws:bedrock:us-east-1::foundation-model/*`,
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
      type: `{ ingestorFunctionName: string, retrieverFunctionName: string, removerFunctionName: string }`,
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
