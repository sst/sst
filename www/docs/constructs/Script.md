---
description: "Docs for the sst.Script construct in the @serverless-stack/resources package"
---

The `Script` construct is a higher level CDK construct that makes it easy to run a script during the deployment process. It provides a simple way to build and bundle the script function; and allows you to pass parameter values based on outputs from other constructs in your SST app. So you don't have to hard code values in your script.

A few things to note:
- Script runs on every deploy.
- Script has a maximum timeout of 15 minutes.
- Live Lambda Dev is currently not supported for Script functions.

## Initializer

```ts
new Script(scope: Construct, id: string, props: ScriptProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ScriptProps`](#scriptprops)

## Examples

The `Script` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Running a Script

```js
import { Script } from "@serverless-stack/resources";

new Script(this, "Script", {
  function: "src/script.main",
});
```

### Configuring the function

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

If `params` are configured, they will be passed in as the event object to the script function as in.

Note that the value for `tableName` will be resolved at deploy time. For example, in this case, the `Table` construct will get created first, and the `Script` constrcut will be run afterwards. And if you were to print out the value of `event.tableName` inside the script function, you will see the name of the table.

### Attaching permissions

You can grant additional permissions to the script.

```js {5}
const script = new Script(this, "Script", {
  function: "src/script.main",
});

script.attachPermissions(["s3"]);
```

### Running before deploy

You can configure the Script to run at the beginning of the deployment, before any resources are deployed.

First, create a "BeforeDeployStack" in "index.js" or ".ts".

```js title="lib/index.js"
const beforeDeployStack = new BeforeDeployStack(app, "before-deploy");
const apiStack = new ApiStack(app, "api");
const dbStack = new DBStack(app, "db");

apiStack.addDependency(beforeDeployStack);
dbStack.addDependency(beforeDeployStack);
```

By making both `apiStack` and `dbStack` depend on `beforeDeployStack`, they will get deployed after `beforeDeployStack` is done deploying.

Then, let's add the script in the "BeforeDeployStack".

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

Now when you deploy this app, the `beforeDeployStack` will get deployed first, which runs the `BeforeDeploy` Script.

Note that if the script fails to run, the deploy fails. And the `apiStack` and the `dbStack` will not get deployed. In this case, you can fix the script, and deploy again.

### Running after deploy

Similarly, you can configure a Script to run at the end of the deployment, after all resources are deployed.

First, create a "AfterDeployStack" in "index.js" or ".ts".

```js title="lib/index.js"
const apiStack = new ApiStack(app, "api");
const dbStack = new DBStack(app, "db");

const afterDeployStack = new AfterDeployStack(app, "after-deploy");
afterDeployStack.addDependency(apiStack);
afterDeployStack.addDependency(dbStack);
```

By making the `afterDeployStack` depend on both `apiStack` and `dbStack`, it will get deployed after the two stacks are done deploying.

Then, let's add the script in the "AfterDeployStack".

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

Now when you deploy this app, the `afterDeployStack` will get deployed at last and runs the `AfterDeploy` Script.

Note that if the script fails to run, the entire deploy is considered failed. And the updates made to the `apiStack` and the `dbStack` will get rolled back. In this case, you can fix the script, and deploy again.

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

Takes `FunctionDefinition` used to create the function for the script.

### params?

_Type_ : `{ [key: string]: any }`, _defaults to_ `{}`

An associative array of input parameters to be passed to the script.
