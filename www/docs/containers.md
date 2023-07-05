---
title: Containers
description: "Working with Lambda Container Functions in SST."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Use containers in your Lambda functions.

</HeadlineText>

---

## Overview

There may be instances when your code exceeds the 250MB Lambda limit. Examples could be video processing or ML tasks with large dependencies. In such cases, containers can be a viable solution. Lambda container functions allows for a maximum size of 10GB.

Let's look at how to do this in detail.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Add the construct

Add the construct to your stacks.

```ts title="stacks/Default.ts"
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: {
    function: {
      runtime: "container",
      handler: "packages/functions/src",
    }
  }
});
```

In this example, we are going to use a cron job to trigger the container function.  The cron job will run every minute and points to the container function that will be invoked.

Make sure to import the [`Cron`](constructs/Cron.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Cron, StackContext, NextjsSite } from "sst/constructs";
```

---

## Add the handler

Let's add the function that'll be invoked. Create a file in `packages/functions/src/cron.ts`.

```ts title="packages/functions/src/cron.ts"
export async function handler() {
  console.log("Running my cron job");
}
```

---

## Add the Dockerfile

Next, let's add a Dockerfile to package our function into a container image.

```ts title="packages/functions/src/Dockerfile"
FROM public.ecr.aws/lambda/nodejs:18
COPY handler.js ${LAMBDA_TASK_ROOT}
CMD ["cron.handler"]
```

---

## FAQ

Here are some frequently asked questions about Container Functions.

---

### When should I use container function?

Because container functions have a much longer cold start than normal Lambda functions, it is recommended to use them for async tasks. For example, as event subscribers and cron jobs.

### Why did the function timeout in dev mode?

In the dev mode, (ie. `sst dev`), the image for a container function is built on the first function invocation. If there are uncached layers that need building, `docker build` may take longer to run. It is recommended to use the [`--increase-timeout`](packages/sst.md#sst-dev) option when running `sst dev`.