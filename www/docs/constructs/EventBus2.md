---
description: "Docs for the sst.EventBus construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new EventBus(scope: Construct, id: string, props: EventBusProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props unknown
## Properties
An instance of `EventBus` has the following properties.
### eventBridgeEventBus

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
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- rules unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey: string, targetIndex: number, permissions: Permissions)
```
_Parameters_
- ruleKey `string`
- targetIndex `number`
- permissions [`Permissions`](Permissions)