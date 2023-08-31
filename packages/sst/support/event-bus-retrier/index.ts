import {
  LambdaClient,
  InvokeCommand,
  GetFunctionCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { SQSHandler } from "aws-lambda";

const lambda = new LambdaClient({});
lambda.middlewareStack.remove("recursionDetectionMiddleware");
const sqs = new SQSClient({});
sqs.middlewareStack.remove("recursionDetectionMiddleware");

export const handler: SQSHandler = async (evt) => {
  for (const record of evt.Records) {
    const parsed = JSON.parse(record.body);
    console.log("body", parsed);
    const functionName = parsed.requestContext.functionArn
      .replace(":$LATEST", "")
      .split(":")
      .pop();
    if (parsed.responsePayload) {
      const attempt = (parsed.requestPayload.attempts || 0) + 1;

      const info = await lambda.send(
        new GetFunctionCommand({
          FunctionName: functionName,
        })
      );
      const max =
        parseInt(
          info.Configuration?.Environment?.Variables?.["SST_RETRIES"] || ""
        ) || 0;
      console.log("max retries", max);
      if (attempt > max) {
        console.log(`giving up after ${attempt} retries`);
        return;
      }
      const seconds = Math.min(Math.pow(2, attempt), 900);
      console.log(
        "delaying retry by ",
        seconds,
        "seconds for attempt",
        attempt
      );
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
      try {
        await lambda.send(
          new InvokeCommand({
            InvocationType: "Event",
            Payload: Buffer.from(JSON.stringify(parsed.requestPayload)),
            FunctionName: functionName,
          })
        );
      } catch (e) {
        if (e instanceof ResourceNotFoundException) {
          return;
        }
        throw e;
      }
    }
  }
};
