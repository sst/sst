import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { SQSClient, ListQueuesCommand } from "@aws-sdk/client-sqs";
const s3 = new S3Client();
const sqs = new SQSClient();

export const handler = async () => {
  const response = [];

  // List buckets
  try {
    await s3.send(new ListBucketsCommand());
    response.push("s3:ListBuckets - success");
  } catch (e: any) {
    response.push(`s3:ListBuckets - failed (${e.message})`);
  }

  // List queues
  try {
    await sqs.send(new ListQueuesCommand());
    response.push("sqs:ListQueues - success");
  } catch (e: any) {
    response.push(`sqs:ListQueues - failed (${e.message})`);
  }

  return {
    statusCode: 200,
    body: `<pre>${JSON.stringify(response, null, 2)}</pre>`,
  };
};
