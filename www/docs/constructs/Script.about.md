The `Script` construct is a higher level CDK construct that makes it easy to run a script in a Lambda function during the deployment process. It provides a simple way to build and bundle the script function; and allows you to pass parameter values based on outputs from other constructs in your SST app. So you don't have to hard code values in your script. You can configure a script to run before or after any of the stacks or resources are deployed in your app.

Since the script is running inside a Lambda function, it can interact with resources like the RDS databases, that are inside a VPC; and make AWS API calls to services that the IAM credentials in your local environment or CI might not have permissions to.

A few things to note:

- It does not run locally. It runs inside a Lambda function.
- It gets run on every deployment.
- It can run for a maximum of 15 minutes.
- [Live Lambda Dev](/live-lambda-development.md) is not enabled for these functions.

## Examples

### Minimal config

```js
import { Script } from "sst/constructs";

new Script(stack, "Script", {
  onCreate: "src/function.create",
  onUpdate: "src/function.update",
  onDelete: "src/function.delete",
});
```

### Configuring parameters

The `params` will be passed in as the `event` object to the function.

```js {12-15}
import { Table, Script } from "sst/constructs";

const table = new Table(stack, "Table", {
  fields: {
    userId: "string",
  },
  primaryIndex: { partitionKey: "userId" },
});

new Script(stack, "Script", {
  onCreate: "src/script.create",
  params: {
    hello: "world",
    tableName: table.tableName,
  },
});
```

So in the above example, the `event.params.tableName` will be available in the onCreate function in `src/script.create`.

Note that, the value for `tableName` will be resolved at deploy time. For example, in this case, the `Table` construct will get created first, and the `Script` construct will be run afterwards. And if you were to print out the value of `event.params.tableName` inside the onCreate function, you will see the name of the table.

### Configuring functions

#### Specifying function props for all the functions

You can extend the minimal config, to set some function props and have them apply to all the functions.

```js {3-7}
new Script(stack, "Script", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  onCreate: "src/script.create",
});
```

#### Configuring an individual function

Configure each Lambda function separately.

```js
new Script(stack, "Script", {
  onCreate: {
    srcPath: "src/",
    handler: "script.create",
    environment: { tableName: table.tableName },
    permissions: [table],
  },
});
```

Note that, you can set the `defaults.function` while configuring a Lambda function. The function's props will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Script(stack, "Script", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  onCreate: {
    handler: "src/script.create",
    timeout: 10,
    environment: { bucketName: bucket.bucketName },
    permissions: [bucket],
  },
  onUpdate: "src/script.update",
});
```

So in the above example, the `onCreate` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Attaching permissions

You can grant additional [permissions](Permissions.md) to the script.

```js {7}
const script = new Script(stack, "Script", {
  onCreate: "src/script.create",
  onUpdate: "src/script.update",
  onDelete: "src/script.delete",
});

script.attachPermissions(["s3"]);
```

### Running before deploy

You can configure the `Script` to run at the beginning of the deployment, before any resources are deployed.

Create a stack for the construct. Let's call it `BeforeDeployStack` and add it to your `stacks/index.js`.

```ts
import { dependsOn, StackContext, Script } from "sst/constructs";

function BeforeDeployStack({stack}: StackContext) {
  new Script(stack, "BeforeDeploy", {
    onCreate: "src/script.create",
  });
}

function ApiStack(ctx: StackContext) {
  dependsOn(BeforeDeployStack);
}

function DBStack(ctx: StackContext) {
  dependsOn(BeforeDeployStack);
}
```

By making both `ApiStack` and `DBStack` depend on `BeforeDeployStack`, they will get deployed after `BeforeDeployStack` is done deploying.

Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#stack-dependencies) in CDK.

Now when you deploy this app, the `BeforeDeployStack` will get deployed first, which runs the `Script`.

Note that, if the script fails to run, the deploy fails. And the `ApiStack` and the `DBStack` will not get deployed. In this case, you can fix the script, and deploy again.

### Running after deploy

Similarly, you can configure a `Script` to run at the end of the deployment, after all resources are deployed.

Create a `AfterDeployStack` in `stacks/index.js`.

```ts
import { dependsOn, StackContext, Script } from "sst/constructs";

function AfterDeployStack({stack}: StackContext) {
  dependsOn(ApiStack)
  dependsOn(DBStack)
  new Script(stack, "AfterDeploy", {
    onCreate: "src/script.create",
  });
}

function ApiStack(ctx: StackContext) {}

function DBStack(ctx: StackContext) {}
```

By making the `AfterDeployStack` depend on both `ApiStack` and `DBStack`, it will get deployed after the two stacks are done deploying.

Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#stack-dependencies) in CDK.

Now when you deploy this app, the `AfterDeployStack` will get deployed at the end and run the `Script`.

Note that, if the script fails to run, the entire deploy is marked as failed. And the updates made to the `ApiStack` and the `DBStack` will get rolled back. In this case, you can fix the script, and deploy again.

### Running multiple Scripts

Multiple scripts within the same Stack can run concurrently. You can manage the order in which they get run by specifying a dependency relationship.

```ts {9}
const scriptA = new Script(stack, "Script", {
  onCreate: "src/scriptA.create",
});

const scriptB = new Script(stack, "Script", {
  onCreate: "src/scriptB.create",
});

scriptB.node.addDependency(scriptA);
```

In this case, `scriptB` will run after `scriptA` is completed.

Here we are making use of the idea of [Construct dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#construct-dependencies) in CDK.
