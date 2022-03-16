---
description: "Docs for the sst.EventBus construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new EventBus(scope: Construct, id: string, props: EventBusProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`EventBusProps`](#eventbusprops)
## Properties
An instance of `EventBus` has the following properties.

### cdk.eventBus

_Type_ : [`IEventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IEventBus.html)


### eventBusArn

_Type_ : `string`

### eventBusName

_Type_ : `string`

## Methods
An instance of `EventBus` has the following methods.
### addRules

```ts
addRules(scope: Construct, rules: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __rules__ 

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey: string, targetIndex: number, permissions: Permissions)
```
_Parameters_
- __ruleKey__ `string`
- __targetIndex__ `number`
- __permissions__ [`Permissions`](Permissions)
## EventBusFunctionTargetProps

### cdk.target

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## EventBusProps

### cdk.eventBus

_Type_ : [`IEventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IEventBus.html)&nbsp; | &nbsp;[`EventBusProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.EventBusProps.html)



### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)





## EventBusQueueTargetProps

### cdk.target

_Type_ : [`SqsQueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsQueueProps.html)


### queue

_Type_ : [`Queue`](Queue)

## EventBusRuleProps

### cdk.rule

_Type_ : Omit<[`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html), `"eventBus"`&nbsp; | &nbsp;`"targets"`>






### pattern.detailType

_Type_ : `string`

### pattern.source

_Type_ : `string`


### targets

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops)&nbsp; | &nbsp;[`EventBusQueueTargetProps`](#eventbusqueuetargetprops)
