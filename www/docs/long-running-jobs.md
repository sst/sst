---
title: Long Running Jobs
description: "Learn how to run long running jobs in your SST apps."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Run functions for longer than Lambda's 15 minute time limit.

</HeadlineText>

---

## Overview

Sometimes you might want to run some code for longer than the 15 minute Lambda limit. But you might not want to manage a container just for that. For example, tasks related to video processing, ETL, and ML.

SST makes it easy to do this with the [`Job`](constructs/Job.md) construct.

1. Define a new `Job` construct in your stacks
2. Create a (long running) function for the job
3. Invoke the job from your frontend or API

Let's look at it in detail.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Create a job

Let's start by adding a job to our app.

```ts title="stacks/Default.ts"
const job = new Job(stack, "factorial", {
  handler: "packages/functions/src/job.handler",
});
```

Make sure to import the [`Job`](constructs/Job.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Job, StackContext, NextjsSite } from "sst/constructs";
```

---

## Bind the job

After adding the job, bind your Next.js app to it.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
  path: "packages/web",
+ bind: [job],
});
```

This allows us to invoke the job in our Next.js app.

---

## Add the job handler

Now let's add our long running function. In this example we'll simply return the factorial of a given number. It'll take a _"payload"_ (input) and compute the factorial.

---

#### Define the payload type

Let's define the type for the payload.

```ts title="packages/functions/src/job.ts"
import { JobHandler } from "sst/node/job";

declare module "sst/node/job" {
  export interface JobTypes {
    factorial: {
      num: number;
    };
  }
}
```

---

#### Define the function

Add the handler function

```ts title="packages/functions/src/job.ts"
export const handler = JobHandler("factorial", async (payload) => {
  let result = 1;
  for (let i = 2; i <= payload.num; i++) {
    result = result * i;
  }

  console.log(`Factorial of ${payload.num} is ${result}`);
});
```

---

## Invoke the job

Finally we can invoke the job in our Next.js app. Here we'll invoke it when we call our API. This is useful for cases when you want to return to the user right away but trigger the a long running job in the background.

```ts title="packages/web/pages/api/hello.ts"
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await Job.factorial.run({
    payload: {
      num: 10,
    },
  });

  res.status(200).send("Job started!");
}
```

Now if you hit the API in your browser, you'll see the factorial printed in the `sst dev` terminal.

---

## How it works

Let's look at how `Job` works. It uses a few resources behind the scenes:

1. An [**AWS CodeBuild**](https://aws.amazon.com/codebuild/) project that runs the handler function inside a docker container.
2. An **invoker Lambda** function that triggers the CodeBuild project.

---

### Runtime environment

The job function runs inside a docker container, using the official [`aws-lambda-nodejs`](https://hub.docker.com/r/amazon/aws-lambda-nodejs) Node.js 16 container image. This image is **similar to the AWS Lambda execution environment**.

Jobs currently only support Node.js runtimes, and they are always bundled by esbuild with the `esm` format. If you are interested in other runtimes, talk to us on Discord.

You can optionally configure the memory size and the timeout for the job.

```ts {3,4}
const job = new Job(stack, "factorial", {
  handler: "packages/functions/src/job.handler",
  timeout: "1 hour",
  memorySize: "7GB",
});
```

See a full list of [memory size](constructs/Job.md#memorysize) and [timeout](constructs/Job.md#timeout) configurations.

---

### Binding resources

Similar to Functions, you can use the `bind` fields to pass other resources to your job, and reference them at runtime.

```ts {4}
const table = new Table(stack, "table", { /* ... */ });

new Job (stack, "factorial, {
  bind: [table], // bind table to job
  handler: "packages/functions/src/job.handler",
});
```

---

### `sst deploy`

1. Calling `new Job()` creates the above resources.

2. When binding to the frontend, API, or any other function. The function is granted the IAM permission to invoke the invoker Lambda function. The invoker Lambda's function name is also passed into the original function as a Lambda environment variable, `SST_Job_functionName_factorial`.

3. At runtime, when running the job:

   ```ts
   await Job.factorial.run({
     payload: {
       num: 100,
     },
   });
   ```

   `Job.factorial.run` gets the name of the invoker function from `process.env.SST_Job_functionName_factorial`, and invokes the function with the payload.

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

### Typesafe payload

In our example, we defined the job type in `packages/functions/src/job.ts`.

```ts title="packages/functions/src/job.ts"
export interface JobTypes {
  factorial: {
    num: number;
  };
}
```

This is being used in two places to ensure typesafety.

1. When running the job, the payload is validated against the job type.

   ```ts {2-4}
   await Job.factorial.run({
     payload: {
       num: 100,
     },
   });
   ```

2. And, when defining the `JobHandler`, the `payload` argument is automatically typed. Your editor can also autocomplete `payload.num` for you, and reports a type error if an undefined field is accessed by mistake.

   ```ts
   export const handler = JobHandler("factorial", async (payload) => {
     // Editor can autocomplete "num"
     console.log(payload.num);

     // Editor shows a type error
     console.log(payload.foo);
   });
   ```

---

## FAQ

Here are some frequently asked questions about `Job`.

---

### How much does it cost to use `Job`?

CodeBuild has a free tier of 100 build minutes per month. After that, you are charged per build minute. You can find the full pricing here — https://aws.amazon.com/codebuild/pricing/. The `general1` instance types are used.

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
- It offers a free tier of 100 build minutes per month (for the general1.small instance type, general1.medium and general1.large aren't included in the free-tier)
- A CodeBuild project is a single AWS resource, and is much faster to deploy

As we collect more feedback on the usage, we are open to switching to using Fargate. When we do, it will be a seamless switch as the implementation details are not exposed.
