import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { useClient } from "../../helpers/aws/client";

const {
  CLUSTER_ARN,
  SECRET_ARN,
  EMBEDDING_MODEL_ID,
  DATABASE_NAME,
  TABLE_NAME,
} = process.env;

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

export async function ingest(event: IngestEvent) {
  console.log(event);
  const embedding = await generateEmbedding(event.text, event.image);
  const metadata = JSON.stringify(event.metadata);
  await storeEmbedding(metadata, embedding);
}
export async function retrieve(event: RetrieveEvent) {
  console.log(event);
  const embedding = await generateEmbedding(event.prompt);
  const metadata = JSON.stringify(event.metadata);
  const result = await queryEmbeddings(
    metadata,
    embedding,
    event.threshold ?? 0,
    event.count ?? 10
  );
  return {
    results: result,
  };
}

async function generateEmbedding(text: string, image?: string) {
  const ret = await useClient(BedrockRuntimeClient).send(
    new InvokeModelCommand({
      body: JSON.stringify({
        inputText: text,
        inputImage: image,
      }),
      modelId: EMBEDDING_MODEL_ID,
      contentType: "application/json",
      accept: "*/*",
    })
  );
  const payload = JSON.parse(Buffer.from(ret.body.buffer).toString());
  return payload.embedding;
}

async function storeEmbedding(metadata: string, embedding: number[]) {
  await useClient(RDSDataClient).send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE_NAME,
      sql: `INSERT INTO ${TABLE_NAME} (embedding, metadata)
                VALUES (ARRAY[${embedding.join(",")}], :metadata)`,
      parameters: [
        {
          name: "metadata",
          value: { stringValue: metadata },
          typeHint: "JSON",
        },
      ],
    })
  );
}

async function queryEmbeddings(
  metadata: string,
  embedding: number[],
  threshold: number,
  count: number
) {
  const score = `embedding <=> (ARRAY[${embedding.join(",")}])::vector`;
  const ret = await useClient(RDSDataClient).send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE_NAME,
      sql: `SELECT id, metadata, ${score} AS score FROM ${TABLE_NAME}
                WHERE ${score} < ${1 - threshold}
                AND metadata @> :metadata
                ORDER BY ${score}
                LIMIT ${count}`,
      parameters: [
        {
          name: "metadata",
          value: { stringValue: metadata },
          typeHint: "JSON",
        },
      ],
    })
  );
  return ret.records?.map((record) => ({
    id: record[0].stringValue,
    metadata: JSON.parse(record[1].stringValue!),
    score: 1 - record[2].doubleValue!,
  }));
}
