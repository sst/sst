---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.


## Constructor
```ts
new Table(scope: Construct, id: string, props: TableProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`TableProps`](#tableprops)
## Properties
An instance of `Table` has the following properties.
### tableArn

_Type_ : `string`

The ARN of the internally created CDK `Table` instance.

### tableName

_Type_ : `string`

The name of the internally created CDK `Table` instance.


### cdk.table

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)

The internally created CDK `Table` instance.


## Methods
An instance of `Table` has the following methods.
### addConsumers

```ts
addConsumers(scope: Construct, consumers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumers__ 



Define additional consumers for table events

#### Examples

```js
table.addConsumers(this, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, [`TableGlobalIndexProps`](#tableglobalindexprops)>


Add additional global secondary indexes where the `key` is the name of the global secondary index

#### Examples

```js
table.addGlobalIndexes({
  gsi1: {
    partitionKey: "pk",
    sortKey: "sk",
  }
})
```

### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, [`TableLocalIndexProps`](#tablelocalindexprops)>


Add additional local secondary indexes where the `key` is the name of the local secondary index

#### Examples

```js
table.addLocalIndexes({
  lsi1: {
    sortKey: "sk",
  }
})
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Grant permissions to all consumers of this table.

#### Examples

```js
table.attachPermissions(["s3"]);
```

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- __consumerName__ `string`
- __permissions__ [`Permissions`](Permissions)


Grant permissions to a specific consumer of this table.

#### Examples

```js
table.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- __consumerName__ `string`


Get the instance of the internally created Function, for a given consumer.
```js
 const table = new Table(this, "Table", {
   consumers: {
     consumer1: "./src/function.handler",
   }
 })
table.attachPermissionsToConsumer("consumer1", ["s3"]);
```

## TableProps


### consumers?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](Function)&nbsp; | &nbsp;[`TableConsumerProps`](#tableconsumerprops)>

Configure DynamoDB streams and consumers

#### Examples


```js
const table = new Table(this, "Table", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```


### defaults.function?

_Type_ : [`FunctionProps`](Function)

The default function props to be applied to all the consumers in the Table. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples


```js
new Table(this, "Table", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
});
```


### fields?

_Type_ : Record<`string`, `"string"`&nbsp; | &nbsp;`"number"`&nbsp; | &nbsp;`"binary"`>

An object defining the fields of the table. Key is the name of the field and the value is the type.

#### Examples

```js
new Table(props.stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  }
})
```

### globalIndexes?

_Type_ : Record<`string`, [`TableGlobalIndexProps`](#tableglobalindexprops)>

Configure the table's global secondary indexes

#### Examples


```js
new Table(props.stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
  },
  globalIndexes: {
    "GSI1": { partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  },
});
```

### kinesisStream?

_Type_ : [`KinesisStream`](KinesisStream)

### localIndexes?

_Type_ : Record<`string`, [`TableLocalIndexProps`](#tablelocalindexprops)>

Configure the table's local secondary indexes

#### Examples


```js
new Table(props.stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    lsi1sk: "string",
  },
  globalIndexes: {
    "lsi1": { sortKey: "lsi1sk" },
  },
});
```


### primaryIndex.partitionKey

_Type_ : `string`

Define the Partition Key for the table's primary index

#### Examples


```js
new Table(props.stack, "Table", {
  fields: {
    pk: "string",
  },
  primaryIndex: { partitionKey: "pk" },
});
```

### primaryIndex.sortKey?

_Type_ : `string`

Define the Sort Key for the table's primary index

#### Examples


```js
new Table(props.stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: { partitionKey: "pk", sortKey: "sk" },
});
```


### stream?

_Type_ : `boolean`&nbsp; | &nbsp;`"new_image"`&nbsp; | &nbsp;`"old_image"`&nbsp; | &nbsp;`"new_and_old_images"`&nbsp; | &nbsp;`"keys_only"`

Configure the information that will be written to the Stream.

#### Examples

```js {8}
new Table(props.stack, "Table", {
  stream: "new_image",
});
```


### cdk.table?

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)&nbsp; | &nbsp;Omit<[`TableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TableProps.html), `"partitionKey"`&nbsp; | &nbsp;`"sortKey"`>

Override the settings of the internally created cdk table


## TableConsumerProps


### function

_Type_ : [`FunctionDefinition`](Function)

Used to create the consumer function for the table.


### cdk.eventSource?

_Type_ : [`DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DynamoEventSourceProps.html)

Override the settings of the internally created event source


## TableLocalIndexProps


### sortKey

_Type_ : `string`

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : Omit<[`LocalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LocalSecondaryIndexProps.html), `"sortKey"`&nbsp; | &nbsp;`"indexName"`>

Override the settings of the internally created local secondary indexes


## TableGlobalIndexProps


### partitionKey

_Type_ : `string`

The field that's to be used as a partition key for the index.

### sortKey?

_Type_ : `string`

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : Omit<[`GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.GlobalSecondaryIndexProps.html), `"partitionKey"`&nbsp; | &nbsp;`"sortKey"`&nbsp; | &nbsp;`"indexName"`>

Override the settings of the internally created global secondary index

