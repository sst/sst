import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SQSHandler } from "aws-lambda";

const lambda = new LambdaClient({});
const sqs = new SQSClient({});
const retries = JSON.parse(process.env.RETRIES!);

export const handler: SQSHandler = async (evt) => {
  for (const record of evt.Records) {
    const parsed = JSON.parse(record.body);
    console.log("body", parsed);
    if (parsed.responsePayload) {
      const attempt = (parsed.requestPayload.attempts || 0) + 1;
      if (attempt > retries[parsed.requestContext.functionArn]) {
        console.log(`giving up after ${attempt} retries`);
        return;
      }
      const seconds = delay(attempt, 1, 60 * 15, 1);
      console.log("delaying retry by ", seconds, "seconds");
      parsed.requestPayload.attempts = attempt;
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.RETRIER_QUEUE_URL,
          DelaySeconds: seconds,
          MessageBody: JSON.stringify({
            requestPayload: parsed.requestPayload,
            requestContext: parsed.requestContext,
          }),
        })
      );
    }

    if (!parsed.responsePayload) {
      console.log("triggering function");
      await lambda.send(
        new InvokeCommand({
          InvocationType: "Event",
          Payload: Buffer.from(JSON.stringify(parsed.requestPayload)),
          FunctionName: parsed.requestContext.functionArn,
        })
      );
    }
  }
};

function delay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitterFactor: number
): number {
  const backoffTime = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const jitter = Math.random() * backoffTime * jitterFactor;
  const delay = backoffTime + jitter;
  return Math.floor(delay);
}
