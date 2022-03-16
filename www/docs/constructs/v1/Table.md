---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package"
---


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

### cdk.table

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)


### tableArn

_Type_ : `string`

### tableName

_Type_ : `string`

## Methods
An instance of `Table` has the following methods.
### addConsumers

```ts
addConsumers(scope: Construct, consumers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumers__ 

### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, 

### secondaryIndexes.cdk.indexProps

_Type_ : Omit<[`dynamodb.GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.dynamodb.GlobalSecondaryIndexProps.html), `"indexName"`&nbsp; | &nbsp;`"partitionKey"`&nbsp; | &nbsp;`"sortKey"`>


### secondaryIndexes.partitionKey

_Type_ : `string`

### secondaryIndexes.sortKey

_Type_ : `string`
>
### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, 

### secondaryIndexes.cdk.indexProps

_Type_ : Omit<[`dynamodb.LocalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.dynamodb.LocalSecondaryIndexProps.html), `"indexName"`&nbsp; | &nbsp;`"sortKey"`>


### secondaryIndexes.sortKey

_Type_ : `string`
>
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- __consumerName__ `string`
- __permissions__ [`Permissions`](Permissions)
### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- __consumerName__ `string`
## TableConsumerProps

### cdk.eventSourceProps

_Type_ : [`DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DynamoEventSourceProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## TableProps

### cdk.table

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)&nbsp; | &nbsp;Omit<[`TableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TableProps.html), `"partitionKey"`&nbsp; | &nbsp;`"sortKey"`>






### defaults.functionProps

_Type_ : [`FunctionProps`](FunctionProps)


### fields

_Type_ : Record<`string`, `"string"`&nbsp; | &nbsp;`"number"`&nbsp; | &nbsp;`"binary"`>

### globalIndexes

_Type_ : Record<`string`, 

### globalIndexes.cdk.indexProps

_Type_ : Omit<[`dynamodb.GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.dynamodb.GlobalSecondaryIndexProps.html), `"indexName"`&nbsp; | &nbsp;`"partitionKey"`&nbsp; | &nbsp;`"sortKey"`>


### globalIndexes.partitionKey

_Type_ : `string`

### globalIndexes.sortKey

_Type_ : `string`
>

### kinesisStream

_Type_ : [`KinesisStream`](KinesisStream)

### localIndexes

_Type_ : Record<`string`, 

### localIndexes.cdk.indexProps

_Type_ : Omit<[`dynamodb.LocalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.dynamodb.LocalSecondaryIndexProps.html), `"indexName"`&nbsp; | &nbsp;`"sortKey"`>


### localIndexes.sortKey

_Type_ : `string`
>


### primaryIndex.partitionKey

_Type_ : `string`

### primaryIndex.sortKey

_Type_ : `string`


### stream

_Type_ : `boolean`&nbsp; | &nbsp;`"new_image"`&nbsp; | &nbsp;`"old_image"`&nbsp; | &nbsp;`"new_and_old_images"`&nbsp; | &nbsp;`"keys_only"`
