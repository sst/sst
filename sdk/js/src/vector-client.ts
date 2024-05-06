import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import { Resource } from "./resource.js";

export type IngestEvent = {
  /**
   * The text used to generate the embedding vector.
   * At least one of `text` or `image` must be provided.
   * @example
   * ```js
   * {
   *   text: "This is an example text.",
   * }
   * ```
   */
  text?: string;
  /**
   * The base64 representation of the image used to generate the embedding vector.
   * At least one of `text` or `image` must be provided.
   * @example
   * ```js
   * {
   *   image: await fs.readFile("./file.jpg").toString("base64"),
   * }
   * ```
   */
  image?: string;
  /**
   * Metadata for the event in JSON format.
   * This metadata will be used to filter when retrieving and removing embeddings.
   * @example
   * ```js
   * {
   *   metadata: {
   *     type: "movie",
   *     id: "movie-123",
   *     name: "Spiderman",
   *   }
   * }
   * ```
   */
  metadata: Record<string, any>;
};

export type RetrieveEvent = {
  /**
   * The text prompt used to retrieve embeddings.
   * At least one of `text` or `image` must be provided.
   * @example
   * ```js
   * {
   *   text: "This is an example text.",
   * }
   * ```
   */
  text?: string;
  /**
   * The base64 representation of the image prompt used to retrive embeddings.
   * At least one of `text` or `image` must be provided.
   * @example
   * ```js
   * {
   *   image: await fs.readFile("./file.jpg").toString("base64"),
   * }
   * ```
   */
  image?: string;
  /**
   * The metadata used to filter the retrieval of embeddings.
   * Only embeddings with metadata that match the provided fields will be returned.
   * @example
   * ```js
   * {
   *   include: {
   *     type: "movie",
   *     release: "2001",
   *   }
   * }
   * ```
   * This will match the embedding with metadata:
   *  {
   *    type: "movie",
   *    name: "Spiderman",
   *    release: "2001",
   *  }
   *
   * But not the embedding with metadata:
   *  {
   *    type: "book",
   *    name: "Spiderman",
   *    release: "2001",
   *  }
   */
  include: Record<string, any>;
  /**
   * Exclude embeddings with metadata that match the provided fields.
   * @example
   * ```js
   * {
   *   include: {
   *     type: "movie",
   *     release: "2001",
   *   },
   *   exclude: {
   *     name: "Spiderman",
   *   }
   * }
   * ```
   * This will match the embedding with metadata:
   *  {
   *    type: "movie",
   *    name: "A Beautiful Mind",
   *    release: "2001",
   *  }
   *
   * But not the embedding with metadata:
   *  {
   *    type: "book",
   *    name: "Spiderman",
   *    release: "2001",
   *  }
   */
  exclude?: Record<string, any>;
  /**
   * The threshold of similarity between the prompt and the retrieved embeddings.
   * Only embeddings with a similarity score higher than the threshold will be returned.
   * Expected value is between 0 and 1.
   * - 0 means the prompt and the retrieved embeddings are completely different.
   * - 1 means the prompt and the retrieved embeddings are identical.
   * @default `0`
   * @example
   * ```js
   * {
   *   threshold: 0.5,
   * }
   * ```
   */
  threshold?: number;
  /**
   * The number of results to return.
   * @default `10`
   * @example
   * ```js
   * {
   *   count: 10,
   * }
   * ```
   */
  count?: number;
};

export type RemoveEvent = {
  /**
   * The metadata used to filter the removal of embeddings.
   * Only embeddings with metadata that match the provided fields will be removed.
   * @example
   * To remove embeddings for movie with id "movie-123":
   * ```js
   * {
   *   include: {
   *     id: "movie-123",
   *   }
   * }
   * ```
   * To remove embeddings for all movies:
   *  {
   *   include: {
   *    type: "movie",
   *   }
   *  }
   */
  include: Record<string, any>;
};

type RetriveResponse = {
  /**
   * Metadata for the event in JSON format that was provided when ingesting the embedding.
   */
  metadata: Record<string, any>;
  /**
   * The similarity score between the prompt and the retrieved embedding.
   */
  score: number;
};

const lambda = new LambdaClient();

export function VectorClient<
  T extends keyof {
    // @ts-expect-error
    [key in keyof Resource as "sst.aws.Vector" extends Resource[key]["type"]
      ? string extends key
        ? never
        : key
      : never]: Resource[key];
  },
>(name: T) {
  return {
    ingest: async (event: IngestEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          // @ts-expect-error
          FunctionName: Resource[name].ingestor,
          Payload: JSON.stringify(event),
        }),
      );

      parsePayload(ret, "Failed to ingest into the vector db");
    },

    retrieve: async (event: RetrieveEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          // @ts-expect-error
          FunctionName: Resource[name].retriever,
          Payload: JSON.stringify(event),
        }),
      );
      return parsePayload<RetriveResponse>(
        ret,
        "Failed to retrieve from the vector db",
      );
    },

    remove: async (event: RemoveEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          // @ts-expect-error
          FunctionName: Resource[name].remover,
          Payload: JSON.stringify(event),
        }),
      );
      parsePayload(ret, "Failed to remove from the vector db");
    },
  };
}

function parsePayload<T>(output: InvokeCommandOutput, message: string): T {
  const payload = JSON.parse(Buffer.from(output.Payload!).toString());

  // Set cause to the payload so that it can be logged in CloudWatch
  if (output.FunctionError) {
    const e = new Error(message);
    e.cause = payload;
    throw e;
  }

  return payload;
}
