import * as cdk from "aws-cdk-lib";
import { MainStack as ApiStack } from "./api-stack";
import { MainStack as ApiExtraRoutesStack } from "./api-extra-routes-stack";
import { MainStack as EventBusStack } from "./eventbus-stack";
import { MainStack as ApolloStack } from "./apollo-api-stack";
import { MainStack as CronStack } from "./cron-stack";
import { MainStack as BucketStack } from "./bucket-stack";
import { MainStack as TableStack } from "./table-stack";
import { MainStack as TopicStack } from "./topic-stack";
import { MainStack as AppsyncStack } from "./app-sync-api-stack";
import { MainStack as WebsocketStack } from "./websocket-api-stack";
import { MainStack as StreamStack } from "./kinesis-stream";
import { MainStack as ApiV1Stack } from "./apiv1-stack";
import { MainStack as SiteStack } from "./static-site-stack";
import { MainStack as ReactSiteStack } from "./react-static-site-stack";
import { MainStack as NextjsStack } from "./nextjs-site-stack";
import { MainStack as ScriptStack } from "./script-stack";

//import { MainStack as AnotherStack } from "./table-to-kinesis-stack";
//import { MainStack as AnotherStack } from "./topic-to-queue-stack";
//import { MainStack as AnotherStack } from "./api-with-lambda-authorizer";
//import { MainStack as AnotherStack } from "./step-functions-stack";
//import { MainStack as EmptyStack } from "./empty-stack";
//import { MainStack as ErrorStack } from "./error-stack";

import * as sst from "@serverless-stack/resources";

export default async function main(app: sst.App) {
  const apiStack = new ApiStack(app, "api");
  new ApiExtraRoutesStack(app, "api-extra-routes", { api: apiStack.api });
  new ApiV1Stack(app, "apiv1");
  new ApolloStack(app, "apollo");
  new AppsyncStack(app, "appsync");
  new WebsocketStack(app, "websocket");

  new CronStack(app, "cron");
  new BucketStack(app, "bucket");
  new TopicStack(app, "topic");
  new EventBusStack(app, "event-bus");
  new StreamStack(app, "stream");
  new ReactSiteStack(app, "site", { api: apiStack.api });
  new NextjsStack(app, "nextjs", { api: apiStack.api });
  new ScriptStack(app, "script", { api: apiStack.api });

  //new EmptyStack(app, "empty");
  //new ErrorStack(app, "error");
}

export function debugStack(
  app: cdk.App,
  stack: cdk.Stack,
  props: sst.DebugStackProps
): void {
  cdk.Tags.of(app).add("stage-region", `${props.stage}-${stack.region}`);
}
