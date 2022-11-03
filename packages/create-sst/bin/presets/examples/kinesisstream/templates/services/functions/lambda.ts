import AWS from "aws-sdk";
import { KinesisStream } from "@serverless-stack/node/kinesis-stream";

const stream = new AWS.Kinesis();

export async function handler() {
  await stream
    .putRecord({
      Data: JSON.stringify({
        message: "Hello from Lambda!",
      }),
      PartitionKey: "key",
      StreamName: KinesisStream.Stream.streamName,
    })
    .promise();

  console.log("Message queued!");
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
