/* eslint-disable @typescript-eslint/ban-ts-comment*/

import {
  ABSENT,
  ResourcePart,
  expect as expectCdk,
  countResources,
  haveResource,
} from "aws-cdk-lib/assert";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import {
  App,
  Stack,
  Function,
  Table,
  TableProps,
  TableIndexProps,
  TableFieldType,
  KinesisStream,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("constructor: no props", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow type casting
    new Table(stack, "Table", {} as TableProps);
  }).toThrow(/Missing "fields"/);
});

test("constructor: dynamodbTable is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    dynamodbTable: new dynamodb.Table(stack, "DDB", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    }),
  });
  expect(table.tableArn).toBeDefined();
  expect(table.tableName).toBeDefined();
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      TableName: ABSENT,
      PointInTimeRecoverySpecification: ABSENT,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      KinesisStreamSpecification: ABSENT,
    })
  );
});

test("constructor: dynamodbTable is imported", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    dynamodbTable: dynamodb.Table.fromTableArn(
      stack,
      "DDB",
      "arn:aws:dynamodb:us-east-1:123:table/myTable"
    ),
  });
  expect(table.tableArn).toBeDefined();
  expect(table.tableName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 0));
});

test("constructor: kinesisStream", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream");
  new Table(stack, "Table", {
    ...baseTableProps,
    kinesisStream: stream,
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      KinesisStreamSpecification: {
        StreamArn: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
      },
    })
  );
});

/////////////////////////////
// Test fields and index props
/////////////////////////////

test("constructor: fields-primaryIndex-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      TableName: "dev-my-app-Table",
      BillingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      KeySchema: [
        { AttributeName: "noteId", KeyType: "HASH" },
        { AttributeName: "userId", KeyType: "RANGE" },
      ],
    })
  );
});

test("constructor: fields-primaryIndex-undefined", async () => {
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

test("constructor: fields-globalIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
      time: TableFieldType.NUMBER,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: { partitionKey: "userId", sortKey: "time" },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
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
    })
  );
});

test("constructor: fields-secondaryIndexes-defined (deprecated)", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
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
    })
  );
});

test("constructor: fields-localIndexes-defined", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
      time: TableFieldType.NUMBER,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: { sortKey: "time" },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
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
    })
  );
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
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      // @ts-ignore Allow type casting
      primaryIndex: {} as TableIndexProps,
    });
  }).toThrow(/Missing "partitionKey" in primary index/);
});

test("constructor: fields-dynamodbTable-construct-error", async () => {
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

test("constructor: fields-dynamodbTable-props", async () => {
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
  expectCdk(stack).to(
    haveResource(
      "AWS::DynamoDB::Table",
      {
        DeletionPolicy: "Delete",
      },
      ResourcePart.CompleteDefinition
    )
  );
});

test("constructor: fields-dynamodbTable-props-with-partitionKey-error", async () => {
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

test("constructor: fields-dynamodbTable-props-with-sortKey-error", async () => {
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

test("globalIndexes-options", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    globalIndexes: {
      userTimeIndex: {
        partitionKey: "userId",
        sortKey: "time",
        indexProps: {
          projectionType: dynamodb.ProjectionType.KEYS_ONLY,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
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
    })
  );
});

test("globalIndexes-indexProps-indexName-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
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

test("globalIndexes-indexProps-partitionKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
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

test("globalIndexes-indexProps-sortKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      globalIndexes: {
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

test("localIndexes-options", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    fields: {
      noteId: TableFieldType.STRING,
      userId: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
    localIndexes: {
      userTimeIndex: {
        sortKey: "time",
        indexProps: {
          projectionType: dynamodb.ProjectionType.KEYS_ONLY,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
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
    })
  );
});

test("localIndexes-indexProps-indexName-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      localIndexes: {
        userTimeIndex: {
          sortKey: "time",
          indexProps: {
            indexName: "index",
            projectionType: dynamodb.ProjectionType.KEYS_ONLY,
          } as dynamodb.LocalSecondaryIndexProps,
        },
      },
    });
  }).toThrow(/Cannot configure the "indexProps.indexName"/);
});

test("localIndexes-indexProps-sortKey-exists-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      fields: {
        noteId: TableFieldType.STRING,
        userId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
      localIndexes: {
        userTimeIndex: {
          sortKey: "time",
          indexProps: {
            sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.KEYS_ONLY,
          } as dynamodb.LocalSecondaryIndexProps,
        },
      },
    });
  }).toThrow(/Cannot configure the "indexProps.sortKey"/);
});

/////////////////////////////
// Test consumers props
/////////////////////////////

const baseTableProps = {
  fields: {
    noteId: TableFieldType.STRING,
    userId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
};

test("consumers: no-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 0));
});

test("consumers: empty-consumer", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", { ...baseTableProps, consumers: {} });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 0));
});

test("consumers: consumers is array (deprecated)", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: true,
      // @ts-ignore: Testing for deprecated consumers property
      consumers: ["test/lambda.handler"],
    });
  }).toThrow(/The "consumers" property no longer takes an array/);
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
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 10,
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::EventSourceMapping", {
      FunctionName: { Ref: "TableConsumer0BC1C1271" },
      BatchSize: 100,
      EventSourceArn: { "Fn::GetAtt": ["Table710B521B", "StreamArn"] },
      StartingPosition: "LATEST",
    })
  );
});

test("consumers: Function string single with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 3,
    })
  );
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
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 2));
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
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
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
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("consumers: Function props", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: { handler: "test/lambda.handler" },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
});

test("consumers: Function props with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: {
        handler: "test/lambda.handler",
        timeout: 5,
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 5,
    })
  );
});

test("consumers: TableFunctionConsumerProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: {
        function: "test/lambda.handler",
        consumerProps: {
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::EventSourceMapping", {
      StartingPosition: "TRIM_HORIZON",
    })
  );
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
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 1));
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      StreamSpecification: { StreamViewType: "NEW_AND_OLD_IMAGES" },
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
});

test("consumers: stream-enum", async () => {
  const stack = new Stack(new App(), "stack");
  new Table(stack, "Table", {
    ...baseTableProps,
    stream: dynamodb.StreamViewType.NEW_IMAGE,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 1));
  expectCdk(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      StreamSpecification: { StreamViewType: "NEW_IMAGE" },
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
});

test("consumers: add consumers when dynamodbTable is imported without tableStreamArn", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      dynamodbTable: dynamodb.Table.fromTableArn(
        stack,
        "DDB",
        "arn:aws:dynamodb:us-east-1:123:table/myTable"
      ),
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
    dynamodbTable: dynamodb.Table.fromTableAttributes(stack, "DDB", {
      tableArn: "arn:aws:dynamodb:us-east-1:123:table/myTable",
      tableStreamArn:
        "arn:aws:dynamodb:us-east-1:123:table/myTable/stream/2021",
    }),
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 1));
});

test("consumers: error-stream-conflict-with-globalTables", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      ...baseTableProps,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
      dynamodbTable: {
        replicationRegions: ["us-west-1"],
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
      dynamodbTable: {
        stream: dynamodb.StreamViewType.NEW_IMAGE,
      },
      stream: true,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Cannot configure the "dynamodbTableProps.stream" in the "Table" Table/
  );
});

test("consumers: error-dynamodbTable-construct", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Table(stack, "Table", {
      dynamodbTable: new dynamodb.Table(stack, "DDB", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      }),
      stream: true,
      consumers: {
        Consumer_0: "test/lambda.handler",
      },
    });
  }).toThrow(
    /Cannot configure the "stream" when "dynamodbTable" is a construct in the "Table" Table/
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
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("AWS::Lambda::EventSourceMapping", 2));
});

test("addConsumers: consumers is array (deprecated)", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    ...baseTableProps,
    stream: true,
    consumers: {
      Consumer_0: "test/lambda.handler",
    },
  });
  expect(() => {
    // @ts-ignore: Testing for deprecated consumers property
    table.addConsumers(stack, ["test/lambda.handler"]);
  }).toThrow(/The "consumers" property no longer takes an array/);
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
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
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
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
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
  expectCdk(stackA).to(countResources("AWS::Lambda::EventSourceMapping", 1));
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
  expectCdk(stackB).to(countResources("AWS::Lambda::EventSourceMapping", 1));
  expectCdk(stackB).to(
    haveResource("AWS::IAM::Policy", {
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
    })
  );
});
