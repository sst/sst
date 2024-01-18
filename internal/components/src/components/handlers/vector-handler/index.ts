import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { OpenAI } from "openai";
import { useClient } from "../../helpers/aws/client";

export type IngestEvent = {
  text?: string;
  image?: string;
  metadata: Record<string, any>;
};

export type RetrieveEvent = {
  text?: string;
  image?: string;
  include: Record<string, any>;
  exclude?: Record<string, any>;
  threshold?: number;
  count?: number;
};

export type RemoveEvent = {
  include: Record<string, any>;
};

const {
  CLUSTER_ARN,
  SECRET_ARN,
  DATABASE_NAME,
  TABLE_NAME,
  MODEL,
  MODEL_PROVIDER,
  // modal provider dependent (optional)
  OPENAI_API_KEY,
} = process.env;

export async function ingest(event: IngestEvent) {
  const embedding = await generateEmbedding(event.text, event.image);
  const metadata = JSON.stringify(event.metadata);
  await storeEmbedding(metadata, embedding);
}
export async function retrieve(event: RetrieveEvent) {
  const embedding = await generateEmbedding(event.text, event.image);
  const include = JSON.stringify(event.include);
  // The return type of JSON.stringify() is always "string".
  // This is wrong when "event.exclude" is undefined.
  const exclude = JSON.stringify(event.exclude) as string | undefined;
  const result = await queryEmbeddings(
    include,
    exclude,
    embedding,
    event.threshold ?? 0,
    event.count ?? 10
  );
  return {
    results: result,
  };
}
export async function remove(event: RemoveEvent) {
  const include = JSON.stringify(event.include);
  await removeEmbedding(include);
}

async function generateEmbedding(text?: string, image?: string) {
  if (MODEL_PROVIDER === "openai") {
    return await generateEmbeddingOpenAI(text!);
  }
  return await generateEmbeddingBedrock(text, image);
}

async function generateEmbeddingOpenAI(text: string) {
  const openAi = new OpenAI({ apiKey: OPENAI_API_KEY });
  const embeddingResponse = await openAi.embeddings.create({
    model: MODEL!,
    input: text,
    encoding_format: "float",
  });
  return embeddingResponse.data[0].embedding;
}

async function generateEmbeddingBedrock(text?: string, image?: string) {
  const ret = await useClient(BedrockRuntimeClient).send(
    new InvokeModelCommand({
      body: JSON.stringify({
        inputText: text,
        inputImage: image,
      }),
      modelId: MODEL,
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
  include: string,
  exclude: string | undefined,
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
                AND metadata @> :include
                ${exclude ? "AND NOT metadata @> :exclude" : ""}
                ORDER BY ${score}
                LIMIT ${count}`,
      parameters: [
        {
          name: "include",
          value: { stringValue: include },
          typeHint: "JSON",
        },
        ...(exclude
          ? [
              {
                name: "exclude",
                value: { stringValue: exclude },
                typeHint: "JSON" as const,
              },
            ]
          : []),
      ],
    })
  );
  return ret.records?.map((record) => ({
    id: record[0].stringValue,
    metadata: JSON.parse(record[1].stringValue!),
    score: 1 - record[2].doubleValue!,
  }));
}

async function removeEmbedding(include: string) {
  await useClient(RDSDataClient).send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE_NAME,
      sql: `DELETE FROM ${TABLE_NAME} WHERE metadata @> :include`,
      parameters: [
        {
          name: "include",
          value: { stringValue: include },
          typeHint: "JSON",
        },
      ],
    })
  );
}
