---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package. This construct creates a DynamoDB table."
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

```js {7-9}
new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  dynamodbTable: {
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
});
```

### Configuring an index

Configure the internally created CDK `GlobalSecondaryIndex`.

```js {8-16}
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
        projectionType: dynamodb.ProjectionType.KEYS_ONLY,
      },
    },
  },
});
```

### Importing an existing table

Override the internally created CDK `Table` instance.

```js {2}
new Table(this, "Table", {
  dynamodbTable: dynamodb.fromTableArn(stack, "MyDyanmoDBTable", tableArn),
});
```

## Properties

An instance of `Table` contains the following properties.

### dynamodbTable

_Type_ : [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)

The internally created CDK `Table` instance.

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

### dynamodbTable?

_Type_ : `cdk.aws-dynamodb.Table | TableCdkProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html) or a [`TableCdkProps`](#tablecdkprops) instance. This allows you to override the default settings this construct uses internally to create the table.

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

Or optionally pass in a `TableCdkIndexProps`. This allows you to override the default settings this construct uses internally to create the index.

## TableCdkProps

`TableCdkProps` extends the [`cdk.aws-dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.TableProps.html) type with the exception that the `partitionKey` and the `sortKey` fields are **not accepted**. The parition key and the sort key should be configured using the [`primaryIndex`](#primaryindex) field.

You can use `TableCdkProps` to configure other table properties.

## TableCdkIndexProps

`TableCdkIndexProps` extends the [`cdk.aws-dynamodb.GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.GlobalSecondaryIndexProps.html) type with the exception that the `indexName`, `partitionKey` and the `sortKey` fields are **not accepted**. The index name, parition key and the sort key should be configured using the [`secondaryIndexes`](#secondaryindexes) field.

You can use `TableCdkIndexProps` to configure other index properties.

## TableFieldType

An enum with the following members representing the field types.

| Member | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| BINARY | Up to 400KB of binary data. Must be encoded as base64 before sending to DynamoDB. |
| NUMBER | Numeric values with a maximum of 38 digits. Can be positive, negative, or zero.   |
| STRING | Up to 400KB of UTF-8 encoded text.                                                |

For example, to set a field as string, use `sst.TableFieldType.STRING`.
