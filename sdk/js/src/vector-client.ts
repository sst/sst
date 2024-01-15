import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import { Resource } from "./resource.js";

export type IngestEvent = {
  /**
   * The external ID of the event.
   * If the external ID already exists, the embedding and metadata will be updated.
   * @example
   * ```js
   * {
   *   externalId: "37043bc3-2166-437d-bbf8-a2238d7a5796"
   * }
   */
  externalId: string;
  /**
   * The text used to generate the embedding vector.
   * @example
   * ```js
   * {
   *   text: "This is an example text.",
   * }
   * ```
   */
  text: string;
  /**
   * The base64 representation of the image used to generate the embedding vector.
   * @example
   * ```js
   * {
   *   image: await fs.readFile("./file.jpg").toString("base64"),
   * }
   * ```
   */
  image?: string;
  /**
   * Additional metadata for the event in JSON format.
   * This metadata will be used to filter the retrieval of events.
   * @example
   * ```js
   * {
   *   metadata: {
   *     key1: "value1",
   *     key2: "value2"
   *   }
   * }
   * ```
   */
  metadata: any;
};

export type RetrieveEvent = {
  /**
   * The prompt used to retrieve events.
   * @example
   * ```js
   * {
   *   prompt: "This is an example text.",
   * }
   * ```
   */
  prompt: string;
  /**
   * The metadata used to filter the retrieval of events.
   * Only events with metadata that match the provided fields will be returned.
   * @example
   * ```js
   * {
   *   metadata: {
   *     type: "movie",
   *     name: "Spiderman",
   *   }
   * }
   * ```
   * This will match event with metadata:
   *  {
   *    type: "movie",
   *    name: "Spiderman",
   *    release: "2001",
   *  }
   * But this will not match event with metadata:
   *  {
   *    type: "book",
   *    name: "Spiderman",
   *    release: "1962",
   *  }
   */
  metadata: any;
  /**
   * The threshold of similarity between the prompt and the retrieved events.
   * Only events with a similarity score higher than the threshold will be returned.
   * Expected value is between 0 and 1.
   * - 0 means the prompt and the retrieved events are completely different.
   * - 1 means the prompt and the retrieved events are identical.
   * @default 0
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
   * @default 10
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
   * The external ID of the event to remove.
   * @example
   * ```js
   * {
   *   externalId: "37043bc3-2166-437d-bbf8-a2238d7a5796"
   * }
   */
  externalId: string;
};

const lambda = new LambdaClient();

export const VectorClient = (name: string) => {
  return {
    ingest: async (event: IngestEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          FunctionName: Resource[name].ingestorFunctionName,
          Payload: JSON.stringify(event),
        })
      );

      return parsePayload(ret, "Failed to ingest into the vector db");
    },

    retrieve: async (event: RetrieveEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          FunctionName: Resource[name].retrieverFunctionName,
          Payload: JSON.stringify(event),
        })
      );
      return parsePayload(ret, "Failed to retrieve from the vector db");
    },

    delete: async (event: RemoveEvent) => {
      const ret = await lambda.send(
        new InvokeCommand({
          FunctionName: Resource[name].removerFunctionName,
          Payload: JSON.stringify(event),
        })
      );
      return parsePayload(ret, "Failed to remove from the vector db");
    },
  };
};

function parsePayload(output: InvokeCommandOutput, message: string) {
  const payload = JSON.parse(Buffer.from(output.Payload!).toString());

  // Set cause to the payload so that it can be logged in CloudWatch
  if (output.FunctionError) {
    const e = new Error(message);
    e.cause = payload;
    throw e;
  }

  return payload;
}
