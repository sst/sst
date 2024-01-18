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

const ModelInfo = {
  "amazon.titan-embed-text-v1": {
    provider: "bedrock" as const,
    shortName: "brtt1",
  },
  "amazon.titan-embed-image-v1": {
    provider: "bedrock" as const,
    shortName: "brti1",
  },
  "text-embedding-ada-002": {
    provider: "openai" as const,
    shortName: "oata2",
  },
};

type Model = keyof typeof ModelInfo;

export type IngestEvent = {
  model?: Model;
  text?: string;
  image?: string;
  metadata: Record<string, any>;
};

export type RetrieveEvent = {
  model?: Model;
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
  // modal provider dependent (optional)
  OPENAI_API_KEY,
} = process.env;

export async function ingest(event: IngestEvent) {
  const model = normalizeModel(event.model);
  const embedding = await generateEmbedding(model, event.text, event.image);
  const metadata = JSON.stringify(event.metadata);
  await storeEmbedding(model, metadata, embedding);
}
export async function retrieve(event: RetrieveEvent) {
  const model = normalizeModel(event.model);
  const embedding = await generateEmbedding(model, event.text, event.image);
  const include = JSON.stringify(event.include);
  // The return type of JSON.stringify() is always "string".
  // This is wrong when "event.exclude" is undefined.
  const exclude = JSON.stringify(event.exclude) as string | undefined;
  const result = await queryEmbeddings(
    model,
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

function normalizeModel(model?: Model) {
  model = model ?? "amazon.titan-embed-image-v1";
  if (ModelInfo[model].provider === "openai" && !OPENAI_API_KEY) {
    throw new Error(
      `To use the model "${model}", an OpenAI API key is necessary. Please ensure that "openAiApiKey" has been configured in the Vector component.`
    );
  }
  return model;
}

async function generateEmbedding(model: Model, text?: string, image?: string) {
  if (ModelInfo[model].provider === "openai") {
    return await generateEmbeddingOpenAI(model, text!);
  }
  return await generateEmbeddingBedrock(model, text, image);
}

async function generateEmbeddingOpenAI(model: Model, text: string) {
  const openAi = new OpenAI({ apiKey: OPENAI_API_KEY });
  const embeddingResponse = await openAi.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });
  return embeddingResponse.data[0].embedding;
}

async function generateEmbeddingBedrock(
  model: Model,
  text?: string,
  image?: string
) {
  const ret = await useClient(BedrockRuntimeClient).send(
    new InvokeModelCommand({
      body: JSON.stringify({
        inputText: text,
        inputImage: image,
      }),
      modelId: model,
      contentType: "application/json",
      accept: "*/*",
    })
  );
  const payload = JSON.parse(Buffer.from(ret.body.buffer).toString());
  return payload.embedding;
}

async function storeEmbedding(
  model: Model,
  metadata: string,
  embedding: number[]
) {
  await useClient(RDSDataClient).send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE_NAME,
      sql: `INSERT INTO ${TABLE_NAME} (model, embedding, metadata)
              VALUES (:model, ARRAY[${embedding.join(",")}], :metadata)`,
      parameters: [
        {
          name: "model",
          value: { stringValue: ModelInfo[model].shortName },
        },
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
  model: Model,
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
                WHERE model = :model
                AND ${score} < ${1 - threshold}
                AND metadata @> :include
                ${exclude ? "AND NOT metadata @> :exclude" : ""}
                ORDER BY ${score}
                LIMIT ${count}`,
      parameters: [
        {
          name: "model",
          value: { stringValue: ModelInfo[model].shortName },
        },
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
