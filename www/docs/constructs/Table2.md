---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Table(scope: Construct, id: string, props: TableProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`TableProps`](#tableprops)
## Properties
An instance of `Table` has the following properties.
### dynamodbTable

_Type_ : [`Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Table.html)

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
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- consumers unknown
### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes: Record)
```
_Parameters_
- secondaryIndexes [`Record`](Record)
### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes: Record)
```
_Parameters_
- secondaryIndexes [`Record`](Record)
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- consumerName `string`
- permissions [`Permissions`](Permissions)
### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- consumerName `string`
## TableConsumerProps
### consumerProps

_Type_ : [`DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DynamoEventSourceProps.html)

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## TableProps
### consumers

_Type_ : unknown

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### dynamodbTable

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)&nbsp; | &nbsp;[`Omit`](Omit)

### fields

_Type_ : [`Record`](Record)

### globalIndexes

_Type_ : [`Record`](Record)

### kinesisStream

_Type_ : [`KinesisStream`](KinesisStream)

### localIndexes

_Type_ : [`Record`](Record)

### primaryIndex

_Type_ : unknown

### secondaryIndexes

_Type_ : [`Record`](Record)


Use globalIndexes

### stream

_Type_ : `boolean`&nbsp; | &nbsp;[`StreamViewType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StreamViewType.html)
