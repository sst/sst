---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package. This construct creates a DynamoDB table and enable DynamoDB streams."
---

The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.

## Initializer

```ts
new Table(scope: Construct, id: string, props: TableProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`TableProps`](#tableprops)

## Examples

### Specifying just the primary index

```js
import { Table, TableFieldType } from "@serverless-stack/resources";

new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});
```

### Adding secondary indexes

```js
new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
    time: TableFieldType.NUMBER,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  secondaryIndexes: {
    userTimeIndex: { partitionKey: "userId", sortKey: "time" },
  },
});
```

### Configuring the DynamoDB table

Configure the internally created CDK `Table` instance.

```js {9-11}
import { RemovalPolicy } from "@aws-cdk/core";

new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  dynamodbTable: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
});
```

### Configuring an index

Configure the internally created CDK `GlobalSecondaryIndex`.

```js {10-18}
import { ProjectionType } from "@aws-cdk/aws-dynamodb";

new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
    time: TableFieldType.NUMBER,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  secondaryIndexes: {
    userTimeIndex: {
      partitionKey: "userId",
      sortKey: "time",
      indexProps: {
        projectionType: ProjectionType.KEYS_ONLY,
      },
    },
  },
});
```

### Enabling DynamoDB streams

Enable DynamoDB streams and add consumers.

```js {6-7}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: ["src/consumer1.main", "src/consumer2.main"],
});
```

### Lazily adding consumers

Lazily add the consumers after the table has been defined.

```js {9}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
});

table.addConsumers(this, ["src/consumer1.main", "src/consumer2.main"]);
```

### Giving the consumers permissions

Allow the consumer functions to access S3.

```js {10}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: ["src/consumer1.main", "src/consumer2.main"],
});

table.attachPermissions(["s3"]);
```

### Giving a specific consumer permissions

Allow the first consumer function to access S3.

```js {10}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: ["src/consumer1.main", "src/consumer2.main"],
});

table.attachPermissionsToconsumer(0, ["s3"]);
```

### Configuring the stream content

Configure the information that will be written to the stream.

```js {8}
import { StreamViewType } from "@aws-cdk/aws-dynamodb";

new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: StreamViewType.NEW_IMAGE,
  consumers: ["src/consumer1.main", "src/consumer2.main"],
});
```

### Configuring a consumer

Configure the internally created CDK Event Source.

```js {10-15}
import { StartingPosition } from "@aws-cdk/aws-lambda";

new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: [
    {
      function: "src/consumer1.main",
      consumerProps: {
        startingPosition: StartingPosition.LATEST,
      },
    },
  ],
});
```

### Importing an existing table

Override the internally created CDK `Table` instance.

```js {4-8}
import dynamodb from "@aws-cdk/aws-dynamodb";

new Table(this, "Table", {
  dynamodbTable: dynamodb.Table.fromTableArn(this, "ImportedTable", tableArn),
});
```

## Properties

An instance of `Table` contains the following properties.

### dynamodbTable

_Type_ : [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)

The internally created CDK `Table` instance.

### consumerFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the consumers.

## Methods

An instance of `Table` contains the following methods.

### addConsumers

```ts
addConsumers(scope: cdk.Construct, consumers: (FunctionDefinition | TableConsumerProps)[])
```

_Parameters_

- **scope** `cdk.Construct`
- **consumers** `(FunctionDefinition | TableConsumerProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`TableConsumerProps`](#tableconsumerprops) that'll be used to create the consumers for the table.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the `consumerFunctions`. This allows the consumers to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToConsumer

```ts
attachPermissions(index: number, permissions: Permissions)
```

_Parameters_

- **index** `number`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific function in the list of `consumerFunctions`. Where `index` (starting at 0) is used to identify the consumer. This allows that consumer to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## TableProps

### fields

_Type_ : `{ [key: string]: TableFieldType }`

An associative array with the list of fields of the table. Where `key` is the name of the field and the value is one of [`TableFieldType`](#tablefieldtype).

### primaryIndex

_Type_ : `TableIndexProps`

Define the primary index for the table using the [`TableIndexProps`](#tableindexprops) type.

### secondaryIndexes?

_Type_ : `{ [key: string]: TableIndexProps }`, _defaults to_ `{}`

An associative array of a list of secondary indexes, where the `key` is the name of the secondary index and the value is using the [`TableIndexProps`](#tableindexprops) type.

### stream?

_Type_ : `boolean | cdk.aws-dynamodb.StreamViewType`, defaults to `false`

DynamoDB streams for the table. Takes a `boolean` or a [`cdk.aws-dynamodb.StreamViewType`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.StreamViewType.html).

If `stream` is set to `true`, stream is enabled with `NEW_AND_OLD_IMAGES`.

### consumers?

_Type_ : `(FunctionDefinition | TableConsumerProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`TableConsumerProps`](#tableconsumerprops) that'll be used to create the consumers for the table.

### dynamodbTable?

_Type_ : `cdk.aws-dynamodb.Table | TableCdkProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html) instance or [`TableCdkProps`](#tablecdkprops). This allows you to override the default settings this construct uses internally to create the table.

## TableIndexProps

Used to define an index.

### partitionKey

_Type_: `string`

The field that's to be used as a partition key for the index.

### sortKey?

_Type_: `string`, _defaults to_ `undefined`

The field that's to be used as the sort key for the index.

### indexProps?

_Type_: [`TableCdkIndexProps`](#tablecdkindexprops), _defaults to_ `undefined`

Or optionally pass in `TableCdkIndexProps`. This allows you to override the default settings this construct uses internally to create the index.

## TableConsumerProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the consumer function for the table.

### consumerProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.DynamoEventSourceProps.html), _defaults to_ `DynamoEventSourceProps` with starting point set to `TRIM_HORIZON`.

Or optionally pass in a CDK `DynamoEventSourceProps`. This allows you to override the default settings this construct uses internally to create the consumer.

## TableCdkProps

`TableCdkProps` extends [`cdk.aws-dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.TableProps.html) with the exception that the `partitionKey` and `sortKey` fields are **not accepted**. The parition key and the sort key should be configured using the [`primaryIndex`](#primaryindex) field.

You can use `TableCdkProps` to configure all the other table properties.

## TableCdkIndexProps

`TableCdkIndexProps` extends [`cdk.aws-dynamodb.GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.GlobalSecondaryIndexProps.html) with the exception that the `indexName`, `partitionKey`, and the `sortKey` fields are **not accepted**. The index name, parition key, and the sort key should be configured using the [`secondaryIndexes`](#secondaryindexes) field.

You can use `TableCdkIndexProps` to configure the other index properties.

## TableFieldType

An enum with the following members representing the field types.

| Member | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| BINARY | Up to 400KB of binary data. Must be encoded as base64 before sending to DynamoDB. |
| NUMBER | Numeric values with a maximum of 38 digits. Can be positive, negative, or zero.   |
| STRING | Up to 400KB of UTF-8 encoded text.                                                |

For example, to set a field as string, use `sst.TableFieldType.STRING`.
