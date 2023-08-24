The `Service` construct is a higher level CDK construct that simplifies the deployment of containerized applications. It provides a simple way to build and deploy your app to AWS with these features:

- Deployment to an ECS Fargate cluster with an Application Load Balancer as the front end.
- Auto-scaling based on CPU and memory utilization and per-container request count.
- Directly [referencing other AWS resources](#using-aws-services) in your app.
- Configuring [custom domains](#custom-domains) for your website URL.

---

## Quick Start

To create a service, set `path` to the directory that contains the Dockerfile.

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
WORKDIR /app/

RUN npm install

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

The Docker container uses the Node.js 18 slim image in this instance, installs the dependencies specified in the `package.json`, and then starts the Express server.


When you run `sst deploy`, SST does a couple things:

- Runs `docker build` to build the image
- Uploads the image to Elastic Container Registry (ECR)
- Creates a VPC if one is not provided
- Launches an Elastic Container Service (ECS) cluster in the VPC
- Creates a Fargate service to run the container image
- Creates an Auto Scaling Group to auto-scale the cluster
- Creates an Application Load Balancer (ALB) to route traffic to the cluster
- Creates a CloudFront Distribution to allow configuration of caching and custom domains

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

Fargate [supports a variety of CPU and memory combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size) for the containers. The default size used is 0.25 vCPU and 512 MB. To configure it, do the following:

```js
new Service(stack, "MyService", {
  path: "./service",
  cpu: "2 vCPU",
  memory: "8 GB",
});
```

---

## Auto-scaling

Your cluster can auto-scale as the traffic increases or decreases based on several metrics:
- CPU utilization (default 70%)
- Memory utilization (default 70%)
- Per-container request count (default 500)

You can also set the minimum and maximum number of containers to which the cluster can scale.

Auto-scaling is **disabled by default** as both the minimum and maximum are set to 1.

To configure it:

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

You can also configure an alias domain to point to the main domain. For instance, to set up `www.my-app.com` to redirect to `my-app.com`:

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

SST makes it very easy for your `Service` construct to access other resources in your AWS account. If you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct, you can bind it to your app.

```ts {5}
const bucket = new Bucket(stack, "Uploads");

new Service(stack, "MyService", {
  path: "./service",
  bind: [bucket],
});
```

This will attach the necessary IAM permissions and allow your app to access the bucket via the typesafe [`sst/node`](../clients/index.md) client.

```ts {4}
import { Bucket } from "sst/node/bucket";

console.log(Bucket.Uploads.bucketName);
```

Read more about this in the [Resource Binding](../resource-binding.md) doc.

---

## Private services

If you don't want your service to be publicly accessible, create a private service by disabling the Application Load Balancer and CloudFront distribution.

```ts
new Service(stack, "MyService", {
  path: "./service",
  cdk: {
    applicationLoadBalancer: false,
    cloudfrontDistribution: false,
  },
});
```

---

## Using Nixpacks

If a `Dockerfile` is not found in the service's path, [Nixpacks](https://nixpacks.com/docs) will be used to analyze the service code, and then generate a `Dockerfile` within `.nixpacks`. This file will build and run your application. [Read more about customizing the Nixpacks builds.](https://nixpacks.com/docs/guides/configuring-builds)

:::note
The generated `.nixpacks` directory should be added to your `.gitignore` file.
:::

---

## Examples

### Creating a Service

```js
import { Service } from "sst/constructs";

new Service(stack, "MyService", {
  path: "./service",
});
```

### Using custom Dockerfile

```js
import { Service } from "sst/constructs";

new Service(stack, "MyService", {
  file: "path/to/Dockerfile.prod",
});
```

### Configuring log retention

The Service construct creates a CloudWatch log group to store the logs. By default, the logs are retained indefinitely. You can configure the log retention period like this:

```js
new Service(stack, "MyService", {
  logRetention: "one_week",
});
```

### Configuring additional props

```js
new Service(stack, "MyService", {
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

### Configuring container health check

```js
import { Duration } from "aws-cdk-lib/core";

new Service(stack, "MyService", {
  cdk: {
    container: {
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
        interval: Duration.minutes(30),
        retries: 20,
        startPeriod: Duration.minutes(30),
        timeout: Duration.minutes(30),
      },
    },
  },
});
```

### Using an existing VPC

```js
import { Vpc } from "aws-cdk-lib/aws-ec2";

new Service(stack, "MyService", {
  cdk: {
    vpc: Vpc.fromLookup(stack, "VPC", {
      vpcId: "vpc-xxxxxxxxxx",
    }),
  },
});
```
