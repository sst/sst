---
title: Long Running Jobs
description: "Learn how to run long running jobs in your SST apps."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST ships with `Job` — a simple way to run functions that can take up to 8 hours.

</HeadlineText>

Tasks related to video processing, ETL, and ML can take long. These exceed Lambda's 15 minute timeout limit. `Job` provides a convenient way to run these tasks.

---

## Overview

`Job` is made up of the following pieces:

1. [`Job`](constructs/Job.md) — a construct that creates the necessary infrastructure.
2. [`JobHandler`](clients/job.md#jobhandler) — a handler function that wraps around your function code in a typesafe way.
3. [`Job.run`](clients/job.md) — a helper function to invoke the job.

---

## Quick start

To follow along, you can create the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`.

Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/minimal-typescript) that's based on the same template.

1. **Create the infrastructure**

   To create a new job, import [`Job`](constructs/Job.md) at the top of `stacks/MyStack.ts`.

   ```ts title="stacks/MyStack.ts"
   import { Job } from "sst/constructs";
   ```

   And add a `Job` construct below the API.

   ```ts
   const job = new Job(stack, "myJob", {
     srcPath: "services",
     handler: "functions/myJob.handler",
   });
   ```

2. **Grant permissions**

   Give `api` the permissions to run the job.

   ```ts title="stacks/MyStack.ts"
   api.bind([job]);
   ```

3. **Install dependency**

   Go into `services/` and run

   ```bash
   npm install --save sst/node
   ```

4. **Define the handler function**

   Create the function with the code that needs to run for long. Here for example, we are creating a function to calculate the factorial of a given number.

   Define the shape of the function payload.

   ```ts title="services/functions/myJob.ts"
   import { JobHandler } from "sst/node/job";

   declare module "sst/node/job" {
     export interface JobTypes {
       myJob: {
         num: number;
       };
     }
   }
   ```

   Note that we are defining the job payload to contain a `num` property with type `number`. This'll ensure that we'll get a type error in our editor when we try to pass in a string. We talk more about [typesafety below](#typesafe-payload).

   Then create the handler function using the [`JobHandler`](clients/job.md#jobhandler) helper. Append this to `myJob.ts`.

   ```ts
   export const handler = JobHandler("myJob", async (payload) => {
     // Calculate factorial
     let result = 1;
     for (let i = 2; i <= payload.num; i++) {
       result = result * i;
     }

     console.log(`Factorial of ${payload.num} is ${result}`);
   });
   ```

5. **Run the job**

   And finally we can run this job in our API using the [`Job.myJob.run`](clients/job.md) helper. Change `services/functions/lambda.ts` to:

   ```ts title="services/functions/lambda.ts"
   import { Job } from "sst/node/job";
   import { APIGatewayProxyHandlerV2 } from "aws-lambda";

   export const handler: APIGatewayProxyHandlerV2 = async (event) => {
     await Job.myJob.run({
       payload: {
         num: 100,
       },
     });

     return {
       statusCode: 200,
       headers: { "Content-Type": "text/plain" },
       body: `Job started at ${event.requestContext.time}.`,
     };
   };
   ```

   You'll notice that your editor will autocomplete the `payload` for you.

:::info
`Job.myJob.run` returns right after it starts the long running job.
:::

And that's it. You can now add long running jobs to your apps!

---

## Runtime environment

The job function runs inside a docker container, using the official [`aws-lambda-nodejs`](https://hub.docker.com/r/amazon/aws-lambda-nodejs) Node.js 16 container image. This image is **similar to the AWS Lambda execution environment**.

Jobs currently only support Node.js runtimes, and they are always bundled by esbuild with the `esm` format. If you are interested in other runtimes, talk to us on Discord.

You can optionally configure the memory size and the timeout for the job.

```ts
const job = new Job(stack, "myJob", {
  srcPath: "services",
  handler: "functions/myJob.handler",
  timeout: "1 hour",
  memorySize: "7GB",
});
```

See a full list of [memory size](constructs/Job.md#memorysize) and [timeout](constructs/Job.md#timeout) configurations.

---

## Referencing AWS resources

Similar to Functions, you can use the `bind` fields to pass other resources to your job, and reference them at runtime.

:::tip
[Resource Binding](./resource-binding.md) works inside a job.
:::

For example, to access a [`Table`](constructs/Table.md) inside a job:

```ts
// Create a DynamoDB table
const table = new Table(stack, "myTable", { /* ... */ });

// Create a Job
new Job (stack, "myJob, {
  srcPath: "services",
  handler: "functions/myJob.handler",
  bind: [table], // bind table to job
});
```

Now you can access the table at runtime.

```ts
import { Table } from "sst/node/table";
import { JobHandler } from "sst/node/job";

export const handler = JobHandler("myJob", async (payload) => {
  console.log(Table.myTable.tableName);
});
```

---

## How it works

Let's look at how `Job` works. It uses a few resources behind the scenes:

1. An [**AWS CodeBuild**](https://aws.amazon.com/codebuild/) project that runs the handler function inside a docker container.
2. An **invoker Lambda** function that triggers the CodeBuild project.

---

### `sst deploy`

1. Calling `new Job()` creates the above resources.

2. When binding to an API (or any other function):

   ```ts
   api.bind([job]);
   ```

   The API route is granted the IAM permission to invoke the invoker Lambda function. The invoker Lambda's function name is also passed into the route as Lambda environment variable, `SST_Job_functionName_myJob`.

3. At runtime, when running the job:

   ```ts
   await Job.myJob.run({
     payload: {
       num: 100,
     },
   });
   ```

   `Job.myJob.run` gets the name of the invoker function from `process.env.SST_Job_functionName_myJob`, and invokes the function with the payload.

4. The invoker function then triggers the CodeBuild job. The function payload is JSON stringified and passed to the CodeBuild job as environment variable, `SST_PAYLOAD`.

5. Finally, the CodeBuild job decodes `process.env.SST_PAYLOAD`, and runs the job handler with the decoded payload in a Lambda execution environment.

---

### `sst dev`

On `sst dev`, the invoker function is replaced with a stub function. The stub function sends the request to your local machine, and the local version of the job function is executed. This is similar to how [Live Lambda Development](live-lambda-development.md) works for a [`Function`](constructs/Function.md).

:::info
Your locally invoked job has the **same IAM permissions** as the deployed CodeBuild job.
:::

---

### SST Console

The job can be found in the console under the **Functions** tab. And you can manually invoke the job.

![SST Console Functions tab](/img/long-running-jobs/sst-console-job.png)

Here we are passing in `{"num":5}` as the payload for the job.

---

## Typesafe payload

In our example, we defined the job type in `services/functions/myJob.ts`.

```ts title="services/functions/myJob.ts"
export interface JobTypes {
  myJob: {
    num: number;
  };
}
```

This is being used in two places to ensure typesafety.

1. When running the job, the payload is validated against the job type.

   ```ts {2-4}
   await Job.myJob.run({
     payload: {
       num: 100,
     },
   });
   ```

2. And, when defining the `JobHandler`, the `payload` argument is automatically typed. Your editor can also autocomplete `payload.num` for you, and reports a type error if an undefined field is accessed by mistake.

   ```ts
   export const handler = JobHandler("myJob", async (payload) => {
     // Editor can autocomplete "num"
     console.log(payload.num);

     // Editor shows a type error
     console.log(payload.foo);
   });
   ```

<details>
<summary>Behind the scenes</summary>

Let's take a look at how this is all wired up.

1. First, the `sst/node/job` package predefines two interfaces.

   ```ts
   export interface JobNames {}
   export interface JobTypes {}
   ```

2. `JobNames` is managed by SST. When SST builds the app, it generates a type file and adds all job names to the `JobNames` interface.

   ```ts title="node_modules/@types/@serverless-stack__node/Job-LongJob.d.ts"
   import "sst/node/job";
   declare module "sst/node/job" {
     export interface JobNames {
       myJob: string;
     }
   }
   ```

   This type file then gets appended to `index.d.ts`.

   ```ts title="node_modules/@types/@serverless-stack__node/index.d.ts"
   export * from "./Job-LongJob";
   ```

3. `JobTypes` is managed by you. In our example, you defined the payload types in `services/functions/myJob.ts`.

   ```ts title="services/functions/myJob.ts"
   export interface JobTypes {
     myJob: {
       num: number;
     };
   }
   ```

4. With `JobNames` and `JobTypes` defined, `Job.myJob.run` has the type:

   ```ts
   export type JobRunProps<T extends keyof JobResources> = {
     payload?: JobTypes[T];
   };

   async function run(props: JobRunProps<Name>) {}
   ```

   - `props.payload` must be the corresponding job type for the given job

5. And finally `JobHandler` has the type:

   ```ts
   function JobHandler<C extends keyof JobNames>(
     name: C,
     cb: (payload: JobTypes[C]) => void
   ) {}
   ```

   - `name` must be one of the job names defined in your stacks
   - `payload` passed into the `cb` callback function has the job type for the given job

</details>

---

## Cost

CodeBuild has a free tier of 100 build minutes per month. After that, you are charged per build minute. You can find the full pricing here — https://aws.amazon.com/codebuild/pricing/. The `general1` instance types are used.

---

## FAQ

Here are some frequently asked questions about `Job`.

---

### When should I use `Job` vs `Function`?

`Job` is a good fit for running functions that takes longer than 15 minutes, such as

- ML jobs
- ETL jobs
- Video processing

Note that, `Jobs` have a much **longer cold start** time. When a job starts up, CodeBuild has to download the docker image before running the code. This process can take around 30 seconds. `Job` is not a good choice if you are looking to run something right away.

---

### Is `Job` a good fit for batch jobs?

There are a few AWS services that can help you schedule running batch jobs: AWS Batch and Step Functions, etc.

Setting up AWS Batch and Step Functions requires using multiple AWS services, and requires more experience to wire up all the moving parts.

For one off jobs, where you just want to run something longer than 15 minutes, use `Job`. And if you need to run certain jobs on a regular basis, you can explore the above options.

---

### Why CodeBuild instead of Fargate?

We evaluated both CodeBuild and ECS Fargate as the backing service for `Job`.

Both services are similar in the way that they can run code inside a docker container environment. We decided to go with CodeBuild because:

- It can be deployed without a VPC
- It offers a free tier of 100 build minutes per month
- A CodeBuild project is a single AWS resource, and is much faster to deploy

As we collect more feedback on the usage, we are open to switching to using Fargate. When we do, it will be a seamless switch as the implementation details are not exposed.
