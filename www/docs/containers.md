---
title: Containers
description: "Working with Containers in SST."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Use containers in your Lambda functions.

</HeadlineText>

---

## Overview

There may be instances when your code exceeds the 250MB Lambda limit. Examples could be video processing or ML tasks with large dependencies. In such cases, containers can be a viable solution. Lambda container functions allows for a maximum size of 10GB.

Let's look at an example where we invoke a Lambda container function through a cron job.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest
```

---

## Add the construct

Add the `Cron` construct to your stack.

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

The cron job will run every minute and points to a container function.

Make sure to import the [`Cron`](constructs/Cron.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Cron, StackContext, NextjsSite } from "sst/constructs";
```

---

## Add the handler

Let's add the function that'll be invoked. Create a file in `packages/functions/src/cron.py`.

```py title="packages/functions/src/cron.py"
import numpy

def handler(event, context):
    print("Running my cron job")
    return int(numpy.sqrt(16))
```

This function prints a message and calculates the square root of 16 using numpy.

Create a `requirements.txt` file and listing `numpy` in it.

``` title="packages/functions/src/requirements.txt"
numpy
```

---

## Add the Dockerfile

Next, let's add a Dockerfile to package our function into a container.

```Dockerfile title="packages/functions/src/Dockerfile"
# Start from AWS Python 3.8 base image
FROM public.ecr.aws/lambda/python:3.8

# Install the dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy our function code
COPY cron.py ${LAMBDA_TASK_ROOT}

# Set the handler function
CMD [ "cron.handler" ]
```

If you run `sst dev`, you will notice `Running my cron job` is printed out every minute in the terminal.

---

## FAQ

Here are some frequently asked questions about Container Functions.

---

### When should I use container function?

Since container functions have a much longer cold start than normal Lambda functions, it is recommended to use them for async tasks. For example, as event subscribers and cron jobs.

### Why did the function timeout locally?

When running `sst dev`, the image for a container function is built on the first function invocation. If there are uncached layers that need building, `docker build` may take longer to run. It is recommended to use the [`--increase-timeout`](packages/sst.md#sst-dev) option when running `sst dev`.