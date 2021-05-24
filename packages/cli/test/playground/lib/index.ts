//import { ApiV1Stack } from "./apiv1-stack";
//import { MainStack as AppSyncStack } from "./app-sync-api-stack";
import { MainStack as ApiStack } from "./api-stack";
//import { MainStack as ApiWithLambdaAuthStack } from "./api-with-lambda-authorizer";
//import { MainStack as WebSocketApiStack } from "./websocket-api-stack";
//import { MainStack as KinesisStreamStack } from "./kinesis-stream";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  //new ApiV1Stack(app, "apiv1");
  //new AppSyncStack(app, "appsync");
  new ApiStack(app, "api");
  //new ApiWithLambdaAuthStack(app, "api-lambda-auth");
  //new WebSocketApiStack(app, "websocket");
  //new KinesisStreamStack(app, "kinesis-stream");
}
