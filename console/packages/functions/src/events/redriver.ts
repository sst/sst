import { Handler } from "sst/context";
import { Lambda, LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});
export const handler = Handler("sqs", async (evt) => {
  for (const record of evt.Records) {
    console.log("record", JSON.stringify(record, null, 4));
    const parsed = JSON.parse(record.body);
    await lambda.send(
      new InvokeCommand({
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(parsed.requestPayload)),
        FunctionName: parsed.requestContext.functionArn,
      })
    );
  }
});
