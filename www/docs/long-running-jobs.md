---
title: Long Running Jobs
description: "Learn how to run long running jobs in your SST apps."
---

SST ships with `Job` — a simple way to run tasks that can take up to 8 hours.

Video processing, ETL, and ML tasks can take long, which exceeds Lambda's 15 minute timeout limit. `Job` provides a convenient alternative for long running tasks.

## Overview

`Job` is made up of the following pieces:

1. [`Job`](./constructs/Job.md) — a construct that creates the necessary infrastructure.
2. [`JobHandler`](./packages/node.md#jobhandler) — a handler function that wraps around your function code in a typesafe way.
3. [`Job.run()`](./packages/node.md#jobrun) — a helper function to invoke the job.

## Quick Start

We'll create a new app using the Minimal TypeScript starter. And we'll look at how to add a Job to your app.

:::info
To follow along, you can create the Minimal TypeScript starter by running `npx create-sst@latest`, select `minimal` project, and then select `minimal/typescript-starter` template.

Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/create-sst-minimal-typescript-starter) based on the same template.
:::

1. To create a new job, import [`Job`](./constructs/Job.md) at the top of `stacks/MyStack.ts`.

  ```ts title="stacks/MyStack.ts"
  import { Job } from "@serverless-stack/resources";
  ```

  And add a Job construct below the Api construct.

  ```ts
  const job = new Job(stack, "MyJob", {
    srcPath: "services",
    handler: "functions/myJob.handler",
  });
  ```

2. Give `api` permissions to run the job.

  ```ts title="stacks/MyStack.ts"
  api.attachPermissions([job]);
  ```

3. Create a job handler function using the [`JobHandler`](./packages/node.md#jobhandler) helper function.

  ```ts title="services/functions/myJob.ts"
  import { JobHandler } from "@serverless-stack/node/job";

  declare module "@serverless-stack/node/job" {
    export interface JobTypes {
      MyJob: {
        num: number;
      };
    }
  }

  export const main = JobHandler("MyJob", async (payload) => {
    // Calculate factorial
    let result = 1;
    for (let i = 2; i <= payload.num; i++) {
      result = result * i;
    }

    console.log(`Factorial of ${payload.num} is ${result}`);
  });
  ```

  In this example, our job is calculating the factorial of `num` passed in through the payload. And it prints out the result at the end of the function.

  Also, note that we are defining the job payload to contain a `num` property with type `number`. This will ensure we get a type error in your editor if we tried to pass in a string. Ready more about [type safety](#type-safe-payload).

4. And finally run this job in our API handler using the [`Job.run()`](./packages/node.md#jobrun) helper function. Change `services/functions/lambda.ts` to:

  ```ts title="services/functions/lambda.ts"
  import { Job } from "@serverless-stack/node/job";
  import { APIGatewayProxyHandlerV2 } from "aws-lambda";

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    await Job.run("MyJob", {
      payload: {
        num: 100
      }
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: `Job started at ${event.requestContext.time}.`,
    };
  };
  ```

  `Job.run()` returns right away after the job has started.

## Runtime environment

The job function runs inside a docker container, using the official [`aws-lambda-nodejs`](https://hub.docker.com/r/amazon/aws-lambda-nodejs) Node.js 16 container image. This image is **similar to the AWS Lambda execution environment**.

Jobs currently only support Node.js runtimes, and they are always bundled by esbuild with the `esm` format.

You can optionally configure the memory size and the timeout for the job.

```ts
  const job = new Job(stack, "MyJob", {
    srcPath: "services",
    handler: "functions/myJob.handler",
    timeout: "1 hour",
    memorySize: "7GB",
  });
```

See a full list of [memory size](./constructs/Job.md#memorysize) and [timeout](./constructs/Job.md#timeout) configurations.

## Referencing other AWS resources

Similar to Functions, you can use the `config` and `permissions` fields to pass other resources to your Job, and reference them at runtime.

:::tip
Both [`Parameters`](./environment-variables.md#configparameter) and [`Secrets`](./environment-variables.md#configsecret) work inside a job.
:::

For example, to access a [`Table`](./constructs/Table.md) inside a job, pass in a Parameter with the table name and grant permissions like this:

```ts
// Create a DynamoDB table
const table = new Table(stack, "MyTable", { /* ... */ });

// Create a Parameter with the table name
const MY_TABLE_NAME = new Config.Parameter(stack, "MY_TABLE_NAME", {
  value: table.tableName,
});

// Create a Job
new Job (stack, "MyJob, {
  srcPath: "services",
  handler: "functions/myJob.handler",
  config: [MY_TABLE_NAME], // pass table name to job
  permissions: [table], // grant job permissions to access the table
});
```

And you can access the table at runtime.

```ts
import { Config } from "@serverless-stack/node/config";
import { JobHandler } from "@serverless-stack/node/job";

export const main = JobHandler("MyJob", async (payload) => {
  console.log(Config.MY_TABLE_NAME);
});
```

## How it works

In this chapter we'll look at how `Job` works behind the scene.

### `sst deploy`

1. When calling `new Job()`, a couple of resources are created:
    - **An [AWS CodeBuild](https://aws.amazon.com/codebuild/) project** that runs the handler function inside a docker container.
    - **An invoker Lambda function** that triggers the CodeBuild project.
    - **A [Config Parameter](./environment-variables.md#configparameter)** with the name of the Lambda function.

  In the above example, the Parameter is named `SST_JOB_MyJob`.

2. When granting `api` permissions to run the job:

  ```ts
  api.attachPermissions([job]);
  ```

  The API route is granted with the IAM permission to invoke the invoker function. The Parameter is also passed into the route's `config` prop.

3. And at runtime, when running the job:

  ```ts
  await Job.run("MyJob", {
    payload: {
      num: 100
    }
  });
  ```

  `Job.run` gets the name of the invoker function from `Config.SST_JOB_MyJob`, and invokes the function with the payload.

4. The invoker function then triggers the CodeBuild job. The function payload is JSON stringified and passed to the CodeBuild job as environment variable `SST_PAYLOAD`.

5. Finally, the CodeBuild job decodes `process.env.SST_PAYLOAD`, and invokes the job handler with the decoded payload.

### `sst start`

On `sst start`, the invoker function is replaced with a stub function. The stub function sends the request to local, and the local version of the job function is executed. This is similar to how [Live Lambda Development](./live-lambda-development.md) works for `Functions`.

## Type-safe payload

In our example, we defined the Job type in `services/functions/myJob.ts`.

```ts
export interface JobTypes {
  MyJob: {
    num: number;
  };
}
```

This is being used in two places to ensure typesafety.

1. When running the job, the payload is validated against the job type.

  ```ts {2-4}
  await Job.run("MyJob", {
    payload: {
      num: 100
    }
  });
  ```

2. And, when defining the `JobHandler`, the `payload` argument is automatically typed. Your editor can also autocomplete `payload.num` for you, and reports a type error if an undefined field is accessed by mistake.

  ```ts
  export const main = JobHandler("MyJob", async (payload) => {
    // Editor can autocomplete "num"
    console.log(payload.num);

    // Editor shows a type error
    console.log(payload.foo);
  });
  ```

## FAQ

### When should I use Job vs Function?

Job is a good fit for tasks such as:
- video processing
- ML
- ETL jobs

### Why CodeBuild instead of Fargate?

## Tips

Now that you know how to test various parts of your app. Here are a couple of tips on writing effective tests.

### Don't test implementation details

In this chapter, we used DynamoDB as our database choice. We could've selected PostgreSQL and our tests would've remained the same.

Your tests should be unaware of things like what table data is being written, and instead just call domain functions to verify their input and output. This will minimize how often you need to rewrite your tests as the implementation details change.

### Isolate tests to run them in parallel

Tests need to be structured in a way that they can be run reliably in parallel. In our domain function and API tests above, we checked to see if the created article exists:

```ts
// Check the newly created article exists
expect(
  list.find((a) => a.articleID === article.createArticle.id)
).not.toBeNull();
```

Instead, if we had checked for the total article count, the test might fail if other tests were also creating articles.

```ts
expect(list.length).toBe(1);
```

The best way to isolate tests is to create separate scopes for each test. In our example, the articles are stored globally. If the articles were stored within a user's scope, you can create a new user per test. This way, tests can run in parallel without affecting each other.