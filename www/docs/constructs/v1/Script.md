---
description: "Docs for the sst.Script construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Script(scope: Construct, id: string, props: ScriptProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ScriptProps`](#scriptprops)
## Properties
An instance of `Script` has the following properties.
### createFunction

_Type_ : [`Function`](Function)

### deleteFunction

_Type_ : [`Function`](Function)

### updateFunction

_Type_ : [`Function`](Function)

## Methods
An instance of `Script` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
## ScriptProps

### defaults.functionProps

_Type_ : [`FunctionProps`](FunctionProps)


### onCreate

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### onDelete

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### onUpdate

_Type_ : [`FunctionDefinition`](FunctionDefinition)



