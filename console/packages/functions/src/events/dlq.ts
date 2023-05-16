import { Handler } from "sst/context";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";

const sqs = new SQSClient({});
export async function handler(evt: any) {
  console.log("event failure", JSON.stringify(evt, null, 4));
  const attempt = (evt.requestPayload.attempts || 0) + 1;
  evt.requestPayload.attempts = attempt;
  const seconds = delay(attempt, 1, 60 * 15, 1);
  console.log("delaying retry by ", seconds, "seconds");
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Queue["bus-redriver"].queueUrl,
      MessageBody: JSON.stringify(evt),
      DelaySeconds: seconds,
    })
  );
}

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
