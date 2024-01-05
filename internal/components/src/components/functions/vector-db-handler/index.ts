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

type Event =
  | {
      type: "ingest";
      content: string;
      metadata: string;
    }
  | {
      type: "query";
      content: string;
      metadata: string;
      threshold: number;
      count: number;
    };

export async function handler(event: Event) {
  console.log(event);
  if (event.type === "ingest") {
    const embedding = await generateEmbedding(event.content);
    await storeEmbedding(event.content, event.metadata || "{}", embedding);
  } else if (event.type === "query") {
    const embedding = await generateEmbedding(event.content);
    const result = await queryEmbeddings(
      event.metadata || "{}",
      embedding,
      event.threshold ?? 0,
      event.count ?? 10
    );
    return {
      results: JSON.stringify(result),
    };
  }

  async function generateEmbedding(content: string) {
    try {
      const ret = await useClient(BedrockRuntimeClient).send(
        new InvokeModelCommand({
          body: JSON.stringify({
            inputText: content,
          }),
          modelId: EMBEDDING_MODEL_ID,
          contentType: "application/json",
          accept: "*/*",
        })
      );
      const payload = JSON.parse(Buffer.from(ret.body.buffer).toString());
      return payload.embedding;
    } catch (error: any) {
      //if (error.name === "ResourceAlreadyExistsException") return;
      throw error;
    }
  }

  async function storeEmbedding(
    content: string,
    metadata: string,
    embedding: number[]
  ) {
    try {
      await useClient(RDSDataClient).send(
        new ExecuteStatementCommand({
          resourceArn: CLUSTER_ARN,
          secretArn: SECRET_ARN,
          database: DATABASE_NAME,
          sql: `INSERT INTO ${TABLE_NAME} (embedding, content, metadata)
                VALUES (ARRAY[${embedding.join(",")}], :content, :metadata)`,
          parameters: [
            { name: "content", value: { stringValue: content } },
            {
              name: "metadata",
              value: { stringValue: metadata },
              typeHint: "JSON",
            },
          ],
        })
      );
    } catch (error: any) {
      //if (error.name === "ResourceAlreadyExistsException") return;
      throw error;
    }
  }

  async function queryEmbeddings(
    metadata: string,
    embedding: number[],
    threshold: number,
    count: number
  ) {
    try {
      const score = `embedding <=> (ARRAY[${embedding.join(",")}])::vector`;
      const ret = await useClient(RDSDataClient).send(
        new ExecuteStatementCommand({
          resourceArn: CLUSTER_ARN,
          secretArn: SECRET_ARN,
          database: DATABASE_NAME,
          sql: `SELECT id, content, metadata, ${score} AS score FROM ${TABLE_NAME}
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
        content: record[1].stringValue,
        metadata: JSON.parse(record[2].stringValue!),
        score: 1 - record[3].doubleValue!,
      }));
    } catch (error: any) {
      //if (error.name === "ResourceAlreadyExistsException") return;
      throw error;
    }
  }
}
