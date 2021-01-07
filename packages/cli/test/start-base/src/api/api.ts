import * as AWS from "aws-sdk";
import mirrarray from "mirrarray";
import { APIGatewayEvent } from "aws-lambda";

import str from "./lib";

const sns = new AWS.SNS();

interface APIResponse {
  statusCode: number;
  body: string;
  headers: { [key: string]: string };
}

export async function main(event: APIGatewayEvent): Promise<APIResponse> {
  console.log(
    `Logging from inside the API Lambda for route: ${event.routeKey}`
  );

  mirrarray(["this", "that", "another"]);

  await sns
    .publish({
      MessageStructure: "string",
      TopicArn: process.env.TOPIC_ARN,
      Message: "Hello from the API Lambda",
    })
    .promise();

  return {
    statusCode: 200,
    body: "Hello World: " + str("Spongebob"),
    headers: { "Content-Type": "text/plain" },
  };
}
