/* eslint-disable @typescript-eslint/ban-ts-comment*/

import "@aws-cdk/assert/jest";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import {
  App,
  Stack,
  Table,
  TableProps,
  TableIndexProps,
  TableFieldType,
} from "../src";

test("base", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  });
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    BillingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    KeySchema: [
      { AttributeName: "noteId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
  });
});

test("secondary-indexes", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
      time: TableFieldType.NUMBER,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    secondaryIndexes: {
      userTimeIndex: { partitionKey: "userId", sortKey: "time" },
    },
  });
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    KeySchema: [
      { AttributeName: "noteId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });
});

test("fields-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow specify TableProps without fields
    new Table(stack, "Table", {
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      secondaryIndexes: {
        userTimeIndex: { partitionKey: "userId", sortKey: "time" },
      },
    } as TableProps);
  }).toThrow(/No fields defined/);
});

test("fields-empty", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {},
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    });
  }).toThrow(/No fields defined/);
});

test("primaryIndex-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow specify TableProps without primaryIndex
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
    } as TableProps);
  }).toThrow(/No primary index defined/);
});

test("primaryIndex-missing-partitionKey", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: {} as TableIndexProps,
    });
  }).toThrow(/No partition key defined/);
});
