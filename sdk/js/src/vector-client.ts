import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";
import { Resource } from "./resource.js";

export type IngestEvent = {
  text: string;
  image?: string;
  metadata: any;
};

export type RetrieveEvent = {
  prompt: string;
  metadata: any;
  threshold?: number;
  count?: number;
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
