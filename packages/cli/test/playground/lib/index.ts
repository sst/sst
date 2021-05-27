import { MainStack as ApiStack } from "./api-stack";
//import { MainStack as TableStack } from "./table-stack";
//import { MainStack as TopicStack } from "./topic-stack";
//import { MainStack as AnotherStack } from "./topic-to-queue-stack";
//import { MainStack as AppSyncStack } from "./app-sync-api-stack";
//import { MainStack as ApiWithLambdaAuthStack } from "./api-with-lambda-authorizer";
//import { MainStack as WebSocketApiStack } from "./websocket-api-stack";
//import { MainStack as KinesisStreamStack } from "./kinesis-stream";
//import { ApiV1Stack } from "./apiv1-stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new ApiStack(app, "api");
  //new AnotherStack(app, "another");
}
