import { Resource } from "sst";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const client = new SQSClient();

export const handler = async (event) => {
  // send a message
  await client.send(
    new SendMessageCommand({
      QueueUrl: Resource.MyQueue.queueUrl,
      MessageBody: "Hello from the subscriber",
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "sent" }, null, 2),
  };
};
