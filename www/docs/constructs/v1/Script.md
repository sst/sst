---
description: "Docs for the sst.Script construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Script` construct is a higher level CDK construct that makes it easy to run a script in a Lambda function during the deployment process. It provides a simple way to build and bundle the script function; and allows you to pass parameter values based on outputs from other constructs in your SST app. So you don't have to hard code values in your script. You can configure a script to run before or after any of the stacks or resources are deployed in your app.

Since the script is running inside a Lambda function, it can interact with resources like the RDS databases, that are inside a VPC; and make AWS API calls to services that the IAM credentials in your local environment or CI might not have permissions to.

A few things to note:
- It does not run locally. It runs inside a Lambda function.
- It gets run on every deployment.
- It can run for a maximum of 15 minutes.
- [Live Lambda Dev](../live-lambda-development.md) is not enabled for these functions.


## Constructor
```ts
new Script(scope: Construct, id: string, props: ScriptProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ScriptProps`](#scriptprops)

## Examples

### Minimal config

```js
import { Script } from "@serverless-stack/resources";

new Script(this, "Script", {
  onCreate: "src/function.create",
  onUpdate: "src/function.update",
  onDelete: "src/function.delete",
});
```


## Properties
An instance of `Script` has the following properties.
### createFunction?

_Type_ : [`Function`](Function)

The internally created onCreate `Function` instance.

### deleteFunction?

_Type_ : [`Function`](Function)

The internally created onDelete `Function` instance.

### updateFunction?

_Type_ : [`Function`](Function)

The internally created onUpdate `Function` instance.

## Methods
An instance of `Script` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Grants additional permissions to the script

#### Examples

```js
script.attachPermissions(["s3"]);
```

## ScriptProps



### defaults.function?

_Type_ : [`FunctionProps`](Function)

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new Script(props.stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
    }
  }
});
```


### onCreate?

_Type_ : [`FunctionDefinition`](Function)

Creates the function that runs when the Script is created.

#### Examples

```js
new Script(props.stack, "Api", {
  onCreate: "src/function.handler",
})
```

### onDelete?

_Type_ : [`FunctionDefinition`](Function)

Create the function that runs when the Script is deleted from the stack.

#### Examples

```js
new Script(props.stack, "Api", {
  onDelete: "src/function.handler",
})
```

### onUpdate?

_Type_ : [`FunctionDefinition`](Function)

Creates the function that runs on every deploy after the Script is created

#### Examples

```js
new Script(props.stack, "Api", {
  onUpdate: "src/function.handler",
})
```

### params?

_Type_ : Record<`string`, `any`>

An object of input parameters to be passed to the script. Made available in the `event` object of the function.

#### Examples

```js
import { Script } from "@serverless-stack/resources";

new Script(this, "Script", {
  onCreate: "src/script.create",
  params: {
    hello: "world",
  },
});
```
