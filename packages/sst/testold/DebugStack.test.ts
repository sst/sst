import { test, expect } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment*/

import {
  ABSENT,
  countResources,
  hasResource,
  hasResourceTemplate,
} from "./helper";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DebugApp, DebugStack } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

function createApp() {
  return new DebugApp({
    name: "my-app",
    stage: "dev",
    region: "us-east-1",
  })
}

/////////////////////////////
// Test constructor
/////////////////////////////

test("cdk.table undefined", async () => {
  const stack = new DebugStack(createApp(), "stack");
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: ABSENT,
    PointInTimeRecoverySpecification: ABSENT,
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
  });
});

test("cdk.table defined", async () => {
  const stack = new DebugStack(createApp(), "stack", {
    cdk: {
      table: {
        pointInTimeRecovery: true
      }
    }
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: ABSENT,
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
  });
});
