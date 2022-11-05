import AWS from "aws-sdk";
import { Queue } from "@serverless-stack/node/queue";

const sqs = new AWS.SQS();

export async function main() {
  // Send a message to queue
  await sqs
    .sendMessage({
      // Get the queue url from the environment variable
      QueueUrl: Queue.Queue.queueUrl,
      MessageBody: JSON.stringify({ ordered: true }),
    })
    .promise();

  console.log("Message queued!");

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
