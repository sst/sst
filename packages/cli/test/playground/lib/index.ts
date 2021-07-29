import * as cdk from "@aws-cdk/core";
import { MainStack as ApiStack } from "./api-stack";
import { MainStack as ApolloApiStack } from "./apollo-api-stack";
//import { MainStack as AnotherStack } from "./cron-stack";
//import { MainStack as AnotherStack } from "./table-stack";
//import { MainStack as AnotherStack } from "./table-to-kinesis-stack";
//import { MainStack as AnotherStack } from "./topic-stack";
//import { MainStack as AnotherStack } from "./topic-to-queue-stack";
//import { MainStack as AnotherStack } from "./app-sync-api-stack";
//import { MainStack as AnotherStack } from "./api-with-lambda-authorizer";
//import { MainStack as AnotherStack } from "./websocket-api-stack";
//import { MainStack as AnotherStack } from "./kinesis-stream";
//import { MainStack as AnotherStack } from "./apiv1-stack";
//import { MainStack as AnotherStack } from "./step-functions-stack";
//import { MainStack as AnotherStack } from "./static-site-stack";
import { MainStack as AnotherStack } from "./react-static-site-stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  const apiStack = new ApiStack(app, "api");
  new ApolloApiStack(app, "apollo-api");
  new AnotherStack(app, "another", { api: apiStack.api });
}

export function debugStack(
  app: cdk.App,
  stack: cdk.Stack,
  props: sst.DebugStackProps
): void {
  cdk.Tags.of(app).add("stage-region", `${props.stage}-${stack.region}`);
}
