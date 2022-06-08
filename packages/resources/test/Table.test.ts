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
import { App, Stack, Function, Table, TableProps, KinesisStream } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

const baseTableProps: TableProps = {
  fields: {
    noteId: "string",
    userId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("cdk.table: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {} as TableProps);
  }).toThrow(/Missing "fields"/);
});

test("cdk.table: is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    cdk: {
      table: new dynamodb.Table(stack, "DDB", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      }),
    },
  });
  expect(table.tableArn).toBeDefined();
  expect(table.tableName).toBeDefined();
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: ABSENT,
    PointInTimeRecoverySpecification: ABSENT,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    KinesisStreamSpecification: ABSENT,
  });
});

test("cdk.table: is imported", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    cdk: {
      table: dynamodb.Table.fromTableArn(
        stack,
        "DDB",
        "arn:aws:dynamodb:us-east-1:123:table/myTable"
      ),
    },
  });
  expect(table.tableArn).toBeDefined();
  expect(table.tableName).toBeDefined();
  countResources(stack, "AWS::DynamoDB::Table", 0);
});

test("kinesisStream", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream");
  new Table(stack, "Table", {
    ...baseTableProps,
    kinesisStream: stream,
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    KinesisStreamSpecification: {
      StreamArn: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
    },
  });
});

/////////////////////////////
// Test fields and index props
/////////////////////////////

test("constructor: fields-primaryIndex-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    BillingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    KeySchema: [
      { AttributeName: "noteId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
  });
});

test("constructor: fields-primaryIndex-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
      },
    } as TableProps);
  }).toThrow(/Missing "primaryIndex" in "Table" Table/);
});

test("constructor: fields-primaryIndex-field-not-defined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
      },
      primaryIndex: { partitionKey: "noteId2" },
    });
  }).toThrow(/Please define "noteId2" in "fields"/);
});

test("constructor: fields-globalIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: { partitionKey: "userId", sortKey: "time" },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
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

test("constructor: fields-localIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: { sortKey: "time" },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    KeySchema: [
      { AttributeName: "noteId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
    LocalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "noteId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });
});

test("constructor: fields-undefined-primaryIndex-defined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    } as TableProps);
  }).toThrow(
    /Cannot configure the "primaryIndex" without setting the "fields"/
  );
});

test("constructor: fields-undefined-globalIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {
      globalIndexes: {
        userTimeIndex: { partitionKey: "userId", sortKey: "time" },
      },
    } as TableProps);
  }).toThrow();
});

test("constructor: fields-undefined-localIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      localIndexes: {
        userTimeIndex: { sortKey: "time" },
      },
    } as TableProps);
  }).toThrow();
});

test("constructor: fields-empty-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {},
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    });
  }).toThrow(/No fields defined/);
});

test("constructor: fields-primaryIndex-missing-partitionKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
      },
      // @ts-ignore Allow type casting
      primaryIndex: {} as TableIndexProps,
    });
  }).toThrow(/partitionKey/);
});

test("constructor: fields-dynamodbTable-construct-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      cdk: {
        table: new dynamodb.Table(stack, "DDB", {
          partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        }),
      },
    });
  }).toThrow(/Cannot configure the "fields" when "cdk.table" is a construct/);
});

test("constructor: fields-dynamodbTable-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    cdk: {
      table: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    },
  });
  hasResourceTemplate(stack, "AWS::DynamoDB::Table", {
    DeletionPolicy: "Delete",
  });
});

test("constructor: fields-dynamodbTable-props-with-partitionKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      cdk: {
        table: {
          // @ts-ignore Allow type casting
          partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.table.partitionKey"/);
});

test("constructor: fields-dynamodbTable-props-with-sortKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      cdk: {
        table: {
          // @ts-ignore Allow type casting
          sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.table.sortKey"/);
});

test("timeToLiveAttribute: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
    },
    primaryIndex: { partitionKey: "noteId" },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    TimeToLiveSpecification: ABSENT,
  });
});

test("timeToLiveAttribute: defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
    },
    primaryIndex: { partitionKey: "noteId" },
    timeToLiveAttribute: "expireAt",
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    TimeToLiveSpecification: {
      AttributeName: "expireAt",
      Enabled: true,
    },
  });
});

test("globalIndexes: projection undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
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

test("globalIndexes: projection keys_only", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        projection: "keys_only",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    GlobalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "KEYS_ONLY",
        },
      },
    ],
  });
});

test("globalIndexes: projection all", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        projection: "all",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
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

test("globalIndexes: projection include", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        projection: ["a", "b"],
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    GlobalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "INCLUDE",
          NonKeyAttributes: ["a", "b"],
        },
      },
    ],
  });
});

test("globalIndexes-options", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        cdk: {
          index: {
            readCapacity: 10,
          },
        },
      },
    },
    cdk: {
      table: {
        billingMode: dynamodb.BillingMode.PROVISIONED,
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
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
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 5,
        },
      },
    ],
  });
});

test("globalIndexes-index-indexName-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
        time: "number",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          cdk: {
            // @ts-ignore Allow type casting
            index: {
              indexName: "index",
              projectionType: dynamodb.ProjectionType.KEYS_ONLY,
            } as dynamodb.GlobalSecondaryIndexProps,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.index.indexName"/);
});

test("globalIndexes-index-partitionKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
        time: "number",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          cdk: {
            // @ts-ignore Allow type casting
            index: {
              partitionKey: {
                name: "userId",
                type: dynamodb.AttributeType.STRING,
              },
              projectionType: dynamodb.ProjectionType.KEYS_ONLY,
            } as dynamodb.GlobalSecondaryIndexProps,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.index.partitionKey"/);
});

test("globalIndexes-index-sortKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
        time: "number",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          cdk: {
            // @ts-ignore Allow type casting
            index: {
              sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
              projectionType: dynamodb.ProjectionType.KEYS_ONLY,
            } as dynamodb.GlobalSecondaryIndexProps,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.index.sortKey"/);
});

test("localIndexes: projection undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: {
        sortKey: "time",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    LocalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "noteId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });
});

test("localIndexes: projection keys_only", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: {
        sortKey: "time",
        projection: "keys_only",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    LocalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "noteId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "KEYS_ONLY",
        },
      },
    ],
  });
});

test("localIndexes: projection all", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: {
        sortKey: "time",
        projection: "all",
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    LocalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "noteId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });
});

test("localIndexes: projection include", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: "string",
      userId: "string",
      time: "number",
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: {
        sortKey: "time",
        projection: ["a", "b"],
      },
    },
  });
  hasResource(stack, "AWS::DynamoDB::Table", {
    TableName: "dev-my-app-Table",
    LocalSecondaryIndexes: [
      {
        IndexName: "userTimeIndex",
        KeySchema: [
          { AttributeName: "noteId", KeyType: "HASH" },
          { AttributeName: "time", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "INCLUDE",
          NonKeyAttributes: ["a", "b"],
        },
      },
    ],
  });
});

test("localIndexes-index-indexName-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
        time: "number",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      localIndexes: {
        userTimeIndex: {
          sortKey: "time",
          cdk: {
            index: {
              indexName: "index",
              projectionType: dynamodb.ProjectionType.KEYS_ONLY,
            } as dynamodb.LocalSecondaryIndexProps,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.index.indexName"/);
});

test("localIndexes-index-sortKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: "string",
        userId: "string",
        time: "number",
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      localIndexes: {
        userTimeIndex: {
          sortKey: "time",
          cdk: {
            index: {
              sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
              projectionType: dynamodb.ProjectionType.KEYS_ONLY,
            } as dynamodb.LocalSecondaryIndexProps,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cdk.index.sortKey"/);
});

/////////////////////////////
// Test consumers props
/////////////////////////////

test("consumers: no-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("consumers: empty-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps, consumers: {} });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("consumers: Function string single", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
  });
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    FunctionName: { Ref: "TableConsumerTableConsumer051F32E1D" },
    BatchSize: 100,
    EventSourceArn: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
    StartingPosition: "LATEST",
  });
});

test("consumers: Function string single with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
    defaults: {
      function: {
        timeout: 3,
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("consumers: Function strings multi", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
      Consumer_1: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 2);
});

test("consumers: Function construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("consumers: Function construct with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: true,
      consumers: {
        Consumer_0: f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("consumers: TableFunctionConsumerProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: {
        function: "test/lambda.handler",
        cdk: {
          eventSource: {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
          },
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    StartingPosition: "TRIM_HORIZON",
  });
});

test("consumers: stream-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
  hasResource(stack, "AWS::DynamoDB::Table", {
    StreamSpecification: { StreamViewType: "NEW_AND_OLD_IMAGES" },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("consumers: stream-enum", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: "new_image",
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
  hasResource(stack, "AWS::DynamoDB::Table", {
    StreamSpecification: { StreamViewType: "NEW_IMAGE" },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("consumers: add consumers when dynamodbTable is imported without tableStreamArn", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      cdk: {
        table: dynamodb.Table.fromTableArn(
          stack,
          "DDB",
          "arn:aws:dynamodb:us-east-1:123:table/myTable"
        ),
      },
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Please enable the "stream" option to add consumers to the "Table" Table. To import a table with stream enabled, use the/
  );
});

test("consumers: add consumers when dynamodbTable is imported with tableStreamArn", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    cdk: {
      table: dynamodb.Table.fromTableAttributes(stack, "DDB", {
        tableArn: "arn:aws:dynamodb:us-east-1:123:table/myTable",
        tableStreamArn:
          "arn:aws:dynamodb:us-east-1:123:table/myTable/stream/2021",
      }),
    },
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("consumers: error-stream-conflict-with-globalTables", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: "new_image",
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
      cdk: {
        table: {
          replicationRegions: ["us-west-1"],
        },
      },
    });
  }).toThrow(
    /`stream` must be set to `NEW_AND_OLD_IMAGES` when specifying `replicationRegions`/
  );
});

test("consumers: error-stream-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Please enable the "stream" option to add consumers to the "Table" Table/
  );
});

test("consumers: error-stream-false", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: false,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Please enable the "stream" option to add consumers to the "Table" Table/
  );
});

test("consumers: error-stream-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      cdk: {
        table: {
          stream: dynamodb.StreamViewType.NEW_IMAGE,
        },
      },
      stream: true,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(/Cannot configure the "cdk.table.stream" in the "Table" Table/);
});

test("consumers: error-dynamodbTable-construct", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      cdk: {
        table: new dynamodb.Table(stack, "DDB", {
          partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        }),
      },
      stream: true,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Cannot configure the "stream" when "cdk.table" is a construct in the "Table" Table/
  );
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("addConsumers", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  table.addConsumers(stack, {
    Consumer_1: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 2);
});

test("getFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
      Consumer_1: "test/lambda.handler",
    },
  });
  expect(table.getFunction("Consumer_0")).toBeDefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
      Consumer_1: "test/lambda.handler",
    },
  });
  table.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TableConsumerTableConsumer0ServiceRoleDefaultPolicy4FCBE589",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TableConsumerTableConsumer1ServiceRoleDefaultPolicyFB4719B0",
  });
});

test("attachPermissionsToConsumer", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
      Consumer_1: "test/lambda.handler",
    },
  });
  table.attachPermissionsToConsumer("Consumer_0", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TableConsumerTableConsumer0ServiceRoleDefaultPolicy4FCBE589",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TableConsumerTableConsumer1ServiceRoleDefaultPolicyFB4719B0",
  });
});

test("attachPermissionsToConsumer: consumer not found", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
      Consumer_1: "test/lambda.handler",
    },
  });
  expect(() => {
    table.attachPermissionsToConsumer("Consumer_2", ["s3"]);
  }).toThrow(/The "Consumer_2" consumer was not found in the "Table" Table/);
});

test("attachPermissions-after-addConsumers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const table = new Table(stackA, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  table.attachPermissions(["s3"]);
  table.addConsumers(stackB, {
    Consumer_1: "test/lambda.handler",
  });
  countResources(stackA, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TableConsumerTableConsumer0ServiceRoleDefaultPolicy4FCBE589",
  });
  countResources(stackB, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "dynamodb:ListStreams", Effect: "Allow", Resource: "*" },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          Effect: "Allow",
          Resource: {
            "Fn::ImportValue":
              "dev-my-app-stackA:ExportsOutputFnGetAttTable710B521BStreamArn08276382",
          },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ConsumerTableConsumer1ServiceRoleDefaultPolicyE0062C01",
  });
});
