import path from "path";
import {
  ComponentResourceOptions,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component.js";
import { Postgres, PostgresArgs } from "./postgres.js";
import { EmbeddingsTable } from "./providers/embeddings-table.js";
import { Function } from "./function.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import { Input } from "../input.js";

const ModelInfo = {
  "amazon.titan-embed-text-v1": { provider: "bedrock" as const, size: 1536 },
  "amazon.titan-embed-image-v1": { provider: "bedrock" as const, size: 1024 },
  "text-embedding-ada-002": { provider: "openai" as const, size: 1536 },
  "text-embedding-3-small": { provider: "openai" as const, size: 1536 },
  "text-embedding-3-large": { provider: "openai" as const, size: 2000 },
};

export interface VectorArgs {
  /**
   * The model used for generating the vectors. Supports AWS' and OpenAI's models.
   *
   * To use OpenAI's `text-embedding-ada-002`, `text-embedding-3-small`, or `text-embedding-3-large` model, you'll need to pass in an `openAiApiKey`.
   *
   * :::tip
   * To use OpenAI's models, you'll need to pass in an `openAiApiKey`.
   * :::
   *
   * OpenAI's `text-embedding-3-large` model produces embeddings with 3072 dimensions. This is [scaled down](https://platform.openai.com/docs/guides/embeddings/use-cases) to 2000 dimensions to store it in Postgres. The Postgres database in this component can store up to 2000 dimensions with a pgvector [HNSW index](https://github.com/pgvector/pgvector?tab=readme-ov-file#hnsw).
   *
   * @default `"amazon.titan-embed-text-v1"`
   * @example
   * ```js
   *
   * {
   *   model: "amazon.titan-embed-image-v1"
   * }
   * ```
   */
  model?: Input<keyof typeof ModelInfo>;
  /**
   * Your OpenAI API key. This is needed only if you're using the `text-embedding-ada-002`, `text-embedding-3-small`, or `text-embedding-3-small` model.
   *
   * :::tip
   * Use `sst.Secret` to store your API key securely.
   * :::
   *
   * @example
   * ```js
   *
   * {
   *   openAiApiKey: "<your-api-key>"
   * }
   * ```
   */
  openAiApiKey?: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Postgres component.
     */
    postgres?: Transform<PostgresArgs>;
  };
}

/**
 * The `Vector` component lets you store and retrieve vector data in your app.
 *
 * - It uses an LLM to generate the embedding.
 * - Stores it in a vector database powered by [RDS Postgres Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html).
 * - Provides a [SDK](/docs/reference/sdk/) to ingest, retrieve, and remove the vector data.
 *
 * @example
 *
 * #### Create the database
 *
 * ```ts
 * const vector = new sst.aws.Vector("MyVectorDB");
 * ```
 *
 * #### Change the model
 *
 * Optionally, use a different model, like OpenAI's `text-embedding-3-small` model. You'll need to pass in your OpenAI API key.
 *
 * ```ts {3}
 * new sst.aws.Vector("MyVectorDB", {
 *   openAiApiKey: new sst.aws.Secret("OpenAiApiKey").value,
 *   model: "text-embedding-3-small"
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link it to other resources, like a function or your Next.js app.
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [vector]
 * });
 * ```
 *
 * Once linked, you can query it in your function code using the [SDK](/docs/reference/sdk/).
 *
 * ```ts title="app/page.tsx" {3}
 * import { VectorClient } from "sst";
 *
 * const vector = VectorClient("MyVectorDB");
 *
 * await vector.retrieve({
 *   text: "Some text to search for"
 * });
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
      return new Postgres(
        `${name}Database`,
        transform(args?.transform?.postgres, {}),
        { parent },
      );
    }

    function createDBTable() {
      new EmbeddingsTable(
        `${name}Table`,
        {
          clusterArn: postgres.nodes.cluster.arn,
          secretArn: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
          databaseName,
          tableName,
          vectorSize,
        },
        { parent, dependsOn: postgres.nodes.instance },
      );
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
        ...(openAiApiKey
          ? {
              OPENAI_API_KEY: openAiApiKey,
              OPENAI_MODEL_DIMENSIONS: ModelInfo[model].size.toString(),
            }
          : {}),
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
   * The name of the ingestor Lambda function.
   */
  public get ingestor() {
    return this.ingestHandler.name;
  }

  /**
   * The name of the retriever Lambda function.
   */
  public get retriever() {
    return this.retrieveHandler.name;
  }

  /**
   * The name of the remover Lambda function.
   */
  public get remover() {
    return this.removeHandler.name;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        ingestor: this.ingestor,
        retriever: this.retriever,
        remover: this.remover,
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
