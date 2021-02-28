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

## TableIndexProps

Used to define an index.

### partitionKey

_Type_: `string`

The field that's to be used as a partition key for the index.

### sortKey?

_Type_: `string`, _defaults to_ `undefined`

The field that's to be used as the sort key for the index.

## TableFieldType

An enum with the following members representing the field types.

| Member | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| BINARY | Up to 400KB of binary data. Must be encoded as base64 before sending to DynamoDB. |
| NUMBER | Numeric values with a maximum of 38 digits. Can be positive, negative, or zero.   |
| STRING | Up to 400KB of UTF-8 encoded text.                                                |

For example, to set a field as string, use `sst.TableFieldType.STRING`.
