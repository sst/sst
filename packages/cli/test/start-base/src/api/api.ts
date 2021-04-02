import * as AWS from "aws-sdk";
import mirrarray from "mirrarray";
import { APIGatewayProxyResult } from "aws-lambda";

import str from "./lib";

const sns = new AWS.SNS();

export async function main(): Promise<APIGatewayProxyResult> {
  mirrarray(["this", "that", "another"]);

  await sns
    .publish({
      TopicArn: process.env.TOPIC_ARN,
      Message: "Hello from the API Lambda",
      MessageStructure: "string",
      MessageAttributes: {
        color: { DataType: "String", StringValue: "red" },
      },
    })
    .promise();

  return {
    statusCode: 200,
    body: "Hello World2: " + str("Spongebob"),
    headers: { "Content-Type": "text/plain" },
  };
}
