/* eslint-disable @typescript-eslint/ban-ts-comment*/

import "@aws-cdk/assert/jest";
import { ABSENT, ResourcePart } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import {
  App,
  Stack,
  Function,
  Table,
  TableProps,
  TableIndexProps,
  TableFieldType,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor prop - generic
/////////////////////////////

test("empty-constructor", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {} as TableProps);
  }).toThrow(/Missing "fields"/);
});

/////////////////////////////
// Test constructor props - "fields" is defined
/////////////////////////////

test("fields-primaryIndex-defined", async () => {
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

test("fields-primaryIndex-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
    } as TableProps);
  }).toThrow(/Missing "primaryIndex" in "Table" Table/);
});

test("fields-secondaryIndexes-defined", async () => {
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

test("fields-undefined-primaryIndex-defined", async () => {
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

test("fields-undefined-secondaryIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {
      secondaryIndexes: {
        userTimeIndex: { partitionKey: "userId", sortKey: "time" },
      },
    } as TableProps);
  }).toThrow(
    /Cannot configure the "secondaryIndexes" without setting the "fields"/
  );
});

test("fields-empty-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {},
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    });
  }).toThrow(/No fields defined/);
});

test("fields-primaryIndex-missing-partitionKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      // @ts-ignore Allow type casting
      primaryIndex: {} as TableIndexProps,
    });
  }).toThrow(/Missing "partitionKey" in primary index/);
});

test("fields-dynamodbTable-construct-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      dynamodbTable: new dynamodb.Table(stack, "DDB", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      }),
    });
  }).toThrow(
    /Cannot configure the "fields" when "dynamodbTable" is a construct/
  );
});

test("fields-dynamodbTable-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    dynamodbTable: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
  });
  expect(stack).toHaveResource(
    "AWS::DynamoDB::Table",
    {
      DeletionPolicy: "Delete",
    },
    ResourcePart.CompleteDefinition
  );
});

test("fields-dynamodbTable-props-with-partitionKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      // @ts-ignore Allow type casting
      dynamodbTable: {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      } as dynamodb.TableProps,
    });
  }).toThrow(/Cannot configure the "dynamodbTableProps.partitionKey"/);
});

test("fields-dynamodbTable-props-with-sortKey-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      // @ts-ignore Allow type casting
      dynamodbTable: {
        sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      } as dynamodb.TableProps,
    });
  }).toThrow(/Cannot configure the "dynamodbTableProps.sortKey"/);
});

/////////////////////////////
// Test constructor props - "dynamodbTable" is construct
/////////////////////////////

test("dynamodbTable-construct", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    dynamodbTable: new dynamodb.Table(stack, "DDB", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    }),
  });
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    TableName: ABSENT,
    PointInTimeRecoverySpecification: ABSENT,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
  });
});

/////////////////////////////
// Test index props
/////////////////////////////

test("secondaryIndexes-options", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    secondaryIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        indexProps: {
          projectionType: dynamodb.ProjectionType.KEYS_ONLY,
        },
      },
    },
  });
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
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

test("secondaryIndexes-indexProps-indexName-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      secondaryIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          // @ts-ignore Allow type casting
          indexProps: {
            indexName: "index",
            projectionType: dynamodb.ProjectionType.KEYS_ONLY,
          } as dynamodb.GlobalSecondaryIndexProps,
        },
      },
    });
  }).toThrow(/Cannot configure the "indexProps.indexName"/);
});

test("secondaryIndexes-indexProps-partitionKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      secondaryIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          // @ts-ignore Allow type casting
          indexProps: {
            partitionKey: {
              name: "userId",
              type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.KEYS_ONLY,
          } as dynamodb.GlobalSecondaryIndexProps,
        },
      },
    });
  }).toThrow(/Cannot configure the "indexProps.partitionKey"/);
});

test("secondaryIndexes-indexProps-sortKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      secondaryIndexes: {
        userTimeIndex: {
          partitionKey: "userId",
          sortKey: "time",
          // @ts-ignore Allow type casting
          indexProps: {
            sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.KEYS_ONLY,
          } as dynamodb.GlobalSecondaryIndexProps,
        },
      },
    });
  }).toThrow(/Cannot configure the "indexProps.sortKey"/);
});

/////////////////////////////
// Test consumers
/////////////////////////////

const baseTableProps = {
  fields: {
    noteId: TableFieldType.STRING,
    userId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
};

test("consumers-no-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps });
  expect(stack).toCountResources("AWS::Lambda::Function", 0);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 0);
});

test("consumers-empty-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps, consumers: [] });
  expect(stack).toCountResources("AWS::Lambda::Function", 0);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 0);
});

test("consumers-function-string-single", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
    FunctionName: { Ref: "TableConsumer0BC1C1271" },
    BatchSize: 100,
    EventSourceArn: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
    StartingPosition: "TRIM_HORIZON",
  });
});

test("consumers-function-string-multi", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler", "test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 2);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 2);
});

test("consumers-function-construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: [f],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
});

test("consumers-function-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: [{ handler: "test/lambda.handler" }],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
});

test("consumers-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: [
      {
        function: "test/lambda.handler",
        consumerProps: {
          startingPosition: lambda.StartingPosition.LATEST,
        },
      },
    ],
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
    StartingPosition: "LATEST",
  });
});

test("addConsumers", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler"],
  });
  table.addConsumers(stack, ["test/lambda.handler"]);
  expect(stack).toCountResources("AWS::Lambda::Function", 2);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 2);
});

test("consumers-stream-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::DynamoDB::Table", 1);
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    StreamSpecification: { StreamViewType: "NEW_AND_OLD_IMAGES" },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
});

test("consumers-stream-enum", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: dynamodb.StreamViewType.NEW_IMAGE,
    consumers: ["test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::DynamoDB::Table", 1);
  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    StreamSpecification: { StreamViewType: "NEW_IMAGE" },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
});

test("consumers-stream-conflict-with-globalTables", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      consumers: ["test/lambda.handler"],
      dynamodbTable: {
        replicationRegions: ["us-west-1"],
      },
    });
  }).toThrow(
    /`stream` must be set to `NEW_AND_OLD_IMAGES` when specifying `replicationRegions`/
  );
});

test("consumers-error-stream-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      consumers: ["test/lambda.handler"],
    });
  }).toThrow(
    /Please enable the "stream" option to add consumers to the "Table" Table./
  );
});

test("consumers-error-stream-false", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: false,
      consumers: ["test/lambda.handler"],
    });
  }).toThrow(
    /Please enable the "stream" option to add consumers to the "Table" Table./
  );
});

test("consumers-error-stream-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      dynamodbTable: {
        stream: dynamodb.StreamViewType.NEW_IMAGE,
      },
      stream: true,
      consumers: ["test/lambda.handler"],
    });
  }).toThrow(
    /Cannot configure the "dynamodbTableProps.stream" in the "Table" Table/
  );
});

test("consumers-error-dynamodbTable-construct", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      dynamodbTable: new dynamodb.Table(stack, "DDB", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      }),
      stream: true,
      consumers: ["test/lambda.handler"],
    });
  }).toThrow(
    /Cannot configure the "stream" when "dynamodbTable" is a construct in the "Table" Table/
  );
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler", "test/lambda.handler"],
  });
  table.attachPermissions(["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "TableConsumer0ServiceRoleDefaultPolicy710701A2",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "TableConsumer1ServiceRoleDefaultPolicyE7C50644",
  });
});

test("attachPermissionsToConsumer", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler", "test/lambda.handler"],
  });
  table.attachPermissionsToConsumer(0, ["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "TableConsumer0ServiceRoleDefaultPolicy710701A2",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "TableConsumer1ServiceRoleDefaultPolicyE7C50644",
  });
});

test("attachPermissions-after-addConsumers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const table = new Table(stackA, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: ["test/lambda.handler"],
  });
  table.attachPermissions(["s3"]);
  table.addConsumers(stackB, ["test/lambda.handler"]);
  expect(stackA).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(stackA).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "TableConsumer0ServiceRoleDefaultPolicy710701A2",
  });
  expect(stackB).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(stackB).toHaveResource("AWS::IAM::Policy", {
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
    PolicyName: "Consumer1ServiceRoleDefaultPolicy3118BC76",
  });
});
