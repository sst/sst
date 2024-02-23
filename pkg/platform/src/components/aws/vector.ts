import path from "path";
import {
  ComponentResourceOptions,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component } from "../component.js";
import { Postgres } from "./postgres.js";
import { EmbeddingsTable } from "./providers/embeddings-table.js";
import { Function } from "./function.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import { Input } from "../input.js";

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
  /**
   * Specifies the  OpenAI API key
   *.This key is required for datar ingestoig and retrieal usvin an OpenAI modelg.
   * @default OpenAI API key is not set
   * @example
   * ```js
   * const OPENAI_API_KEY = new sst.aws.Secret("OPENAI_API_KEY");
   *
   * {
   *   openAiApiKey: OPENAI_API_KEY.value,
   * }
   * ```
   */
  openAiApiKey?: Input<string>;
}

/**
 * The `Vector` component is a higher level component that makes it easy to create a Vector database powered by RDS Postgres Serverless v2.
 *
 * @example
 *
 * #### Using the minimal config
 * ```ts
 * new sst.aws.Vector("MyVectorDB");
 * ```
 */
export class Vector
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private ingestHandler: Function;
  private retrieveHandler: Function;
  private removeHandler: Function;

  constructor(
    name: string,
    args?: VectorArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:aws:Vector", name, args, opts);

    const parent = this;
    const model = normalizeModel();
    const vectorSize = normalizeVectorSize();
    const openAiApiKey = normalizeOpenAiApiKey();
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
        if (model && !ModelInfo[model])
          throw new Error(`Invalid model: ${model}`);
        return model ?? "amazon.titan-embed-image-v1";
      });
    }

    function normalizeOpenAiApiKey() {
      return all([model, args?.openAiApiKey]).apply(([model, openAiApiKey]) => {
        if (ModelInfo[model].provider === "openai" && !openAiApiKey) {
          throw new VisibleError(
            `Please pass in the OPENAI_API_KEY via environment variable to use the ${model} model. You can get your API keys here: https://platform.openai.com/api-keys`,
          );
        }
        return openAiApiKey;
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
          { parent },
        );
      });
    }

    function createIngestHandler() {
      return new Function(
        `${name}Ingestor`,
        {
          description: `${name} ingest handler`,
          bundle: buildBundlePath(),
          handler: "index.ingest",
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent },
      );
    }

    function createRetrieveHandler() {
      return new Function(
        `${name}Retriever`,
        {
          description: `${name} retrieve handler`,
          bundle: buildBundlePath(),
          handler: "index.retrieve",
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent },
      );
    }

    function createRemoveHandler() {
      return new Function(
        `${name}Remover`,
        {
          description: `${name} remove handler`,
          bundle: buildBundlePath(),
          handler: "index.remove",
          environment: buildHandlerEnvironment(),
          permissions: buildHandlerPermissions(),
        },
        { parent },
      );
    }

    function buildBundlePath() {
      return path.join($cli.paths.platform, "dist", "vector-handler");
    }

    function buildHandlerEnvironment() {
      return all([model, openAiApiKey]).apply(([model, openAiApiKey]) => ({
        CLUSTER_ARN: postgres.nodes.cluster.arn,
        SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
        DATABASE_NAME: databaseName,
        TABLE_NAME: tableName,
        MODEL: model,
        MODEL_PROVIDER: ModelInfo[model].provider,
        ...(openAiApiKey ? { OPENAI_API_KEY: openAiApiKey } : {}),
      }));
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

  /**
   * The name of the ingestor function.
   */
  public get ingestorFunctionName() {
    return this.ingestHandler.nodes.function.name;
  }

  /**
   * The name of the retriever function.
   */
  public get retrieverFunctionName() {
    return this.retrieveHandler.nodes.function.name;
  }

  /**
   * The name of the remover function.
   */
  public get removerFunctionName() {
    return this.removeHandler.nodes.function.name;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        ingestorFunctionName: this.ingestorFunctionName,
        retrieverFunctionName: this.retrieverFunctionName,
        removerFunctionName: this.removerFunctionName,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["lambda:InvokeFunction"],
        resources: [
          this.ingestHandler.nodes.function.arn,
          this.retrieveHandler.nodes.function.arn,
          this.removeHandler.nodes.function.arn,
        ],
      },
    ];
  }
}
