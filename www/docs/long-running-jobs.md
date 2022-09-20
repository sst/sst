---
title: Long Running Jobs
description: "Learn how to run long running jobs in your SST apps."
---

SST ships with `Job` — a simple way to run functions that can take up to 8 hours.

Video processing, ETL, and ML tasks can take long, which exceeds Lambda's 15 minute timeout limit. `Job` provides a convenient alternative for long running functions.

---

## Overview

`Job` is made up of the following pieces:

1. [`Job`](./constructs/Job.md) — a construct that creates the necessary infrastructure.
2. [`JobHandler`](./packages/node.md#jobhandler) — a handler function that wraps around your function code in a typesafe way.
3. [`Job.run`](./packages/node.md#jobrun) — a helper function to invoke the job.

---

## Quick Start

We'll create a new app using the Minimal TypeScript starter. And we'll look at how to add a Job to your app.

:::info
To follow along, you can create the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`.

Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/create-sst-minimal-typescript-starter) based on the same template.
:::

---

### Create infrastructure

To create a new job, import [`Job`](./constructs/Job.md) at the top of `stacks/MyStack.ts`.

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

---

### Grant permissions

Give `api` permissions to run the job.

```ts title="stacks/MyStack.ts"
api.attachPermissions([job]);
```

---

### Create handler function

Let's create a funtion to calculate the factorial of a given number. Let's first define the shape of the function payload.

```ts title="services/functions/myJob.ts"
import { JobHandler } from "@serverless-stack/node/job";

declare module "@serverless-stack/node/job" {
  export interface JobTypes {
    MyJob: {
      num: number;
    };
  }
}
```

Note that we are defining the job payload to contain a `num` property with type `number`. This will ensure we get a type error in your editor if we tried to pass in a string. Ready more about [typesafety](#typesafe-payload).

Then create a handler function using the [`JobHandler`](./packages/node.md#jobhandler) helper function. Append this to `myJob.ts`.

```ts
export const main = JobHandler("MyJob", async (payload) => {
  // Calculate factorial
  let result = 1;
  for (let i = 2; i <= payload.num; i++) {
    result = result * i;
  }

  console.log(`Factorial of ${payload.num} is ${result}`);
});
```

---

### Run the job

And finally run this job in our API handler using the [`Job.run`](./packages/node.md#jobrun) helper function. Change `services/functions/lambda.ts` to:

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

:::info
`Job.run` returns right away after the job has started.
:::

---

## Runtime environment

The job function runs inside a docker container, using the official [`aws-lambda-nodejs`](https://hub.docker.com/r/amazon/aws-lambda-nodejs) Node.js 16 container image. This image is **similar to the AWS Lambda execution environment**.

Jobs currently only support Node.js runtimes, and they are always bundled by esbuild with the `esm` format. If you are interested in other runtimes, talk to us in Discord.

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

---

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

---

## How it works

In this chapter we'll look at how `Job` works behind the scene.

---

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

---

### `sst start`

On `sst start`, the invoker function is replaced with a stub function. The stub function sends the request to local, and the local version of the job function is executed. This is similar to how [Live Lambda Development](./live-lambda-development.md) works for `Functions`.

:::info
Your locally invoked job has the **same IAM permissions** as the deployed CodeBuild job.
:::

---

## Typesafe payload

In our example, we defined the Job type in `services/functions/myJob.ts`.

```ts title="services/functions/myJob.ts"
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

<details>
<summary>Behind the scenes</summary>

Let's take a look at how this is all wired up.

1. First, the `@serverless-stack/node/config` package predefines two interfaces.

  ```ts
  export interface JobNames { };
  export interface JobTypes { }
  ```

2. `JobNames` is managed by SST. When SST builds the app, it generates a type file and adds all job names to the `JobNames` interface.

   ```ts title="node_modules/@types/@serverless-stack__node/job.d.ts"
   import "@serverless-stack/node/job";
   declare module "@serverless-stack/node/job" {
     export interface JobNames {
       MyJob: string;
     }
   }
   ```

   This type file then gets appended to `index.d.ts`.

   ```ts title="node_modules/@types/@serverless-stack__node/index.d.ts"
   export * from "./job";
   ```

3. `JobTypes` is managed by you. In our example, you defined the payload types in `services/functions/myJob.ts`.

   ```ts title="services/functions/myJob.ts"
   export interface JobTypes {
     MyJob: {
       num: number;
     };
   }
   ```

4. With `JobNames` and `JobTypes` defined, `Job.run` has the type:

   ```ts
   export type JobProps<C extends Extract<keyof JobTypes, keyof JobNames>> = {
     payload?: JobTypes[C];
   };

   async function run<C extends keyof JobNames>(name: C, props?: JobProps<C>) {
   }
   ```

   - `name` must be one of the job names defined in your stacks;
   - `props.payload` must be the corresponding job type for the given job.

4. And finally `JobHandler` has the type:

   ```ts
   function JobHandler<C extends keyof JobNames>(name: C, cb: (payload: JobTypes[C]) => void) {
   }
   ```

   - `name` must be one of the job names defined in your stacks;
   - `payload` passed into the `cb` callback function has the job type for the given job.

</details>

---

## Cost

CodeBuild has a free tier of 100 build minutes. After that, you are charged per build minute. You can find the full pricing here — https://aws.amazon.com/codebuild/pricing/. The `general1` instance types are used.

---

## FAQ

Here are some frequently asked questions about the Job.

---

### When should I use `Job` vs `Function`?

`Job` is a good fit for running functions that takes longer than 15 minutes, such as
- Vdeo processing
- ML jobs
- ETL jobs

Note that `Jobs` have a much longer cold start time. When a job starts up, CodeBuild has to download the docker image before starting the job. This process can take around 30 seconds. `Job` is probably not an good choice if you are looking to run something right away.

---

### Is `Job` a good fit for batch jobs?

There are a few AWS services that can help you schedule running batch jobs: AWS Batch and Step Functions to name a few.

Setting up AWS Batch and Step Functions require using multiple AWS services, and require more experience to wire up all the moving parts.

For one off jobs where you just want to run something longer than 15 minutes, use `Job`. And if you need to run certain jobs on a regular basis, you can explore options mentioned above.

---

### Why CodeBuild instead of Fargate?

We evaluated both CodeBuild and ECS Fargate as the backing service for Job. Both services are similar in the way that they can run code inside a docker container environment. We decided to go with CodeBuild because:
- It can be deployed without a VPC;
- If offers a free tier of 100 build minutes;
- A CodeBuild project is a single AWS resource, and is much faster to deploy;

As we collect more feedback on the usage, we are open to switching to using Fargate. When we do, it will be a seamless switch as the implementation details are not exposed.