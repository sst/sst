The `Service` construct is a higher level CDK construct that makes it easy to deploy perform container applications. It provides a simple way to build and deploy the app to AWS:

- The app is deployed to an ECS Fargate cluster, and fronted with Application Load Balancer.
- The app is auto-scaled based on CPU and memory utilization, as well as requests to each container.
- You can [reference other AWS resources](#using-aws-services) directly in your app.
- It enables you to [configure custom domains](#custom-domains) for the website URL.

---

## Quick Start

To create a service, set `path` to the directory containing the Dockerfile.

```js
import { Service } from "sst/constructs";

new Service(stack, "MyService", {
  path: "./service",
});
```

Here's an example of the `Dockerfile` for a simple Express app.

```Dockerfile title="./service/Dockerfile"
FROM node:18-bullseye-slim

COPY . /app
RUN npm install

WORKDIR /app/
ENTRYPOINT ["node", "app.mjs"]
```

And the `app.mjs` would look like this:

```ts title="./service/app.mjs"
import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.listen(3000);
```

Here, the Docker container uses the Node.js 18 slim image, installs the dependencies specified in the `package.json`, and starts the Express server.


When you run `sst deploy`, SST does a couple things.
- Runs `docker build` to build the image
- Uploads the image to Elastic Container Registry (ECR)
- Creates a VPC if not provided
- Launches an Elastic Container Service (ECS) cluster in the VPC
- Creates a Fargate service that runs the container image
- Creates an Auto Scaling Group to auto-scale the cluster
- Creates an Application Load Balancer (ALB) to route traffic to the cluster
- Creates a CloudFront Distribution to allow configuring caching and custom domains

---

## Using Nixpacks

When a `Dockerfile` is not found in the service's path, [Nixpacks](https://nixpacks.com/docs) is used to analyze the service code, and then generate a `Dockerfile` inside `.nixpacks` that will build and run your application. [Read more about customizing the Nixpacks builds.](https://nixpacks.com/docs/guides/configuring-builds)

:::note
The `.nixpacks` directory should be git ignored.
:::

---

## Working locally

To work on your app locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your app. For example, in the case of an Express app:

   ```bash
   npx sst bind node app.mjs
   ```

:::note
When running `sst dev`, SST does not deploy your app. It's meant to be run locally.
:::

---

## Configuring containers

Fargate [supports a list of CPU and memory combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size) for the containers. The default size used is 0.25 vCPU and 512 MB. You can configure it like this:

```js
new Service(stack, "MyService", {
  path: "./service",
  cpu: "2 vCPU",
  memory: "8 GB",
});
```

---

## Auto-scaling

As the traffic increases and decreases, your cluster can auto-scale based on a few metrics:
- CPU utilization, default 70%
- Memory utilization, default 70%
- Request count to each container in the cluster, default 500

You can also set the minimum and maximum number of containers the cluster can scale up or down to.

By default, auto-scaling is disabled as the minimum and maximum are both set to 1.

You can configure it like this:

```js
new Service(stack, "MyService", {
  path: "./service",
  scaling: {
    minContainers: 4,
    maxContainers: 16,
    cpuUtilization: 50,
    memoryUtilization: 50,
    requestsPerContainers: 1000,
  }
});
```

---

## Custom domains

You can configure the service with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {3}
new Service(stack, "MyService", {
  path: "./service",
  customDomain: "my-app.com",
});
```

Note that visitors to `http://` will be redirected to `https://`.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` to redirect to `my-app.com`:

```js {5}
new Service(stack, "MyServiceSite", {
  path: "./service",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

---

## Using AWS services

SST makes it very easy for your `Service` construct to access other resources in your AWS account. Imagine you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct. You can bind it to your Next.js app.

```ts {5}
const bucket = new Bucket(stack, "Uploads");

new Service(stack, "MyService", {
  path: "./service",
  bind: [bucket],
});
```

This will attach the necessary IAM permissions and allow your app to access the bucket through the typesafe [`sst/node`](../clients/index.md) client.

```ts {4}
import { Bucket } from "sst/node/bucket";

console.log(Bucket.Uploads.bucketName);
```

You can read more about this over on the [Resource Binding](../resource-binding.md) doc.

---

## Examples

### Creating a Service

```js
import { Service } from "sst/constructs";

new Service(stack, "MyService", {
  path: "./service",
});
```

### Setting additional props

```js
new Service(stack, "MyService", {
  handler: "./service",
  port: 8080,
  cpu: "2 vCPU",
  memory: "8 GB",
  scaling: {
    minContainers: 4,
    maxContainers: 16,
    cpuUtilization: 50,
    memoryUtilization: 50,
    requestsPerContainers: 1000,
  },
  config: [STRIPE_KEY, API_URL],
  permissions: ["ses", bucket],
});
```

### Create a service in a VPC

```js
import { Vpc } from "aws-cdk-lib/aws-ec2";

new Service(stack, "MyService", {
  handler: "src/job.main",
  cdk: {
    vpc: Vpc.fromLookup(stack, "VPC", {
      vpcId: "vpc-xxxxxxxxxx",
    }),
  },
});
```
