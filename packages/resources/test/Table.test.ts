/* eslint-disable @typescript-eslint/ban-ts-comment*/

import "@aws-cdk/assert/jest";
import { ABSENT, ResourcePart } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import {
  App,
  Stack,
  Table,
  TableProps,
  TableIndexProps,
  TableFieldType,
} from "../src";

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
