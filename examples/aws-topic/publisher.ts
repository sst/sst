import { Resource } from "sst";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
const client = new SNSClient();

export const handler = async (event) => {
  await client.send(
    new PublishCommand({
      TargetArn: Resource.MyTopic.arn,
      Message: JSON.stringify({ foo: "bar" }),
      MessageAttributes: { foo: { DataType: "String", StringValue: "bar" } },
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "sent" }, null, 2),
  };
};
