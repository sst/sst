---
description: "Docs for the sst.Script construct in the @serverless-stack/resources package"
---

The `Script` construct is a higher level CDK construct that makes it easy to run a script in a Lambda function during the deployment process. It provides a simple way to build and bundle the script function; and allows you to pass parameter values based on outputs from other constructs in your SST app. So you don't have to hard code values in your script. You can configure a script to run before or after any of the stacks or resources are deployed in your app.

Since the script is running inside a Lambda function, it can interact with resources like the RDS databases, that are inside a VPC; and make AWS API calls to services that the IAM credentials in your local environment or CI might not have permissions to.

A few things to note:
- It does not run locally. It runs inside a Lambda function.
- It gets run on every deployment.
- It can run for a maximum of 15 minutes.
- [Live Lambda Dev](../live-lambda-development.md) is not enabled for these functions.

## Initializer

```ts
new Script(scope: Construct, id: string, props: ScriptProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ScriptProps`](#scriptprops)

## Examples

Let's look at how to use the `Script` construct through a couple of examples.

### Running a Script

```js
import { Script } from "@serverless-stack/resources";

new Script(this, "Script", {
  function: "src/script.main",
});
```

### Configuring the function

You can configure the [`Function`](Function.md) that's used internally.

```js
new Script(this, "Script", {
  function: {
    handler: "src/script.main",
    memorySize: 2048,
    permissions: ["sns"],
  },
});
```

### Configuring parameters

The `params` will be passed in as the `event` object to the function.

```js {12-15}
import { Table, Script } from "@serverless-stack/resources";

const table = new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "userId" },
});

new Script(this, "Script", {
  function: "src/script.main",
  params: {
    hello: "world",
    tableName: table.tableName,
  },
});
```

So in the above example, the `event.tableName` will be available in the function in `src/script.main`.

Note that, the value for `tableName` will be resolved at deploy time. For example, in this case, the `Table` construct will get created first, and the `Script` construct will be run afterwards. And if you were to print out the value of `event.tableName` inside the script function, you will see the name of the table.

### Attaching permissions

You can grant additional [permissions](../util/Permissions.md) to the script.

```js {5}
const script = new Script(this, "Script", {
  function: "src/script.main",
});

script.attachPermissions(["s3"]);
```

### Running before deploy

You can configure the `Script` to run at the beginning of the deployment, before any resources are deployed.

First, create a stack for the construct. Let's call it `BeforeDeployStack` and add it to your `stacks/index.js`.

```js title="lib/index.js"
const beforeDeployStack = new BeforeDeployStack(app, "before-deploy");

const apiStack = new ApiStack(app, "api");
const dbStack = new DBStack(app, "db");

apiStack.addDependency(beforeDeployStack);
dbStack.addDependency(beforeDeployStack);
```

By making both `ApiStack` and `DBStack` depend on `BeforeDeployStack`, they will get deployed after `BeforeDeployStack` is done deploying.

Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html#stack-dependencies) in CDK.

Then, let's add the script to the `BeforeDeployStack`.

```js title="lib/BeforeDeployStack.js"
import { Stack, Script } from "@serverless-stack/resources";

export class BeforeDeployStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Script(this, "BeforeDeploy", {
      function: "src/script.main",
    });
  }
}
```

Now when you deploy this app, the `BeforeDeployStack` will get deployed first, which runs the `Script`.

Note that, if the script fails to run, the deploy fails. And the `ApiStack` and the `DBStack` will not get deployed. In this case, you can fix the script, and deploy again.

### Running after deploy

Similarly, you can configure a `Script` to run at the end of the deployment, after all resources are deployed.

Create a `AfterDeployStack` in `stacks/index.js`.

```js title="lib/index.js"
const apiStack = new ApiStack(app, "api");
const dbStack = new DBStack(app, "db");

const afterDeployStack = new AfterDeployStack(app, "after-deploy");

afterDeployStack.addDependency(apiStack);
afterDeployStack.addDependency(dbStack);
```

By making the `AfterDeployStack` depend on both `ApiStack` and `DBStack`, it will get deployed after the two stacks are done deploying.

Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html#stack-dependencies) in CDK.

Then, let's add the script in the `AfterDeployStack`.

```js title="lib/AfterDeployStack.js"
import { Stack, Script } from "@serverless-stack/resources";

export class AfterDeployStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Script(this, "AfterDeploy", {
      function: "src/script.main",
    });
  }
}
```

Now when you deploy this app, the `AfterDeployStack` will get deployed at the end and run the `Script`.

Note that, if the script fails to run, the entire deploy is marked as failed. And the updates made to the `ApiStack` and the `DBStack` will get rolled back. In this case, you can fix the script, and deploy again.

### Running multiple Scripts

Multiple scripts within the same Stack can run concurrently. You can manage the order in which they get run by specifying a dependency relationship.

```js {9}
const scriptA = new Script(this, "Script", {
  function: "src/scriptA.main",
});

const scriptB = new Script(this, "Script", {
  function: "src/scriptB.main",
});

scriptB.node.addDependency(scriptA);
```

In this case, `scriptB` will run after `scriptA` is completed.

Here we are making use of the idea of [Construct dependencies](https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html#construct-dependencies) in CDK.

## Properties

An instance of `Script` contains the following properties.

### function

_Type_ : [`Function`](Function.md)

The internally created `Function` instance.

## Methods

An instance of `Script` contains the following methods.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md)

Attaches the given list of [permissions](../util/Permissions.md) to the `function`. This allows the script to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## ScriptProps

### function

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

Takes `FunctionDefinition` to create the function for the script.

### params?

_Type_ : `{ [key: string]: any }`, _defaults to_ `{}`

An associative array of input parameters to be passed to the script. Made available in the `event` object of the function. 

So for example, if the `params` are:

``` js
{
  key: "Value"
}
```

Then in the function, `event.key` would give you `Value`.
