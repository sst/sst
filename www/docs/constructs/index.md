---
title: Constructs
sidebar_label: Overview
description: "Constructs are the basic building blocks of SST apps."
---

import config from "../../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Constructs are the basic building blocks of SST apps.

</HeadlineText>

They allow you to define the infrastructure of your app. Each construct bring together multiple AWS resources to make up a functional unit.

<details>
<summary>Behind the scenes</summary>

SST's constructs are built on top of [AWS CDK](https://aws.amazon.com/cdk/). They are designed to address specific use cases and have sensible defaults that make it easier to use AWS.

However, you can configure these defaults. You can even use CDK constructs in your SST app. Read more about the [design principles](../design-principles.md#progressive-disclosure) we use to build our constructs.

</details>

Here's a rough list of the types of constructs that SST supports.

---

## APIs

- [`Api`](./Api.md)
- [`GraphQLApi`](./GraphQLApi.md)
- [`AppSyncApi`](./AppSyncApi.md)
- [`WebSocketApi`](./WebSocketApi.md)

## Frontends

- [`RemixSite`](./RemixSite.md)
- [`StaticSite`](./StaticSite.md)
- [`NextjsSite`](./NextjsSite.md)
- [`ViteStaticSite`](./ViteStaticSite.md)
- [`ReactStaticSite`](./ReactStaticSite.md)

## Databases

- [`RDS`](./RDS.md)
- [`Table`](./Table.md)

## Storage

- [`Bucket`](./Bucket.md)

## Auth

- [`Auth`](./Auth.md)
- [`Cognito`](./Cognito.md)

## Async

- [`Job`](./Job.md)
- [`Cron`](./Cron.md)
- [`Topic`](./Topic.md)
- [`Queue`](./Queue.md)
- [`EventBus`](./EventBus.md)
- [`KinesisStream`](./KinesisStream.md)

---

Are there any additional use cases you'd like SST to support natively? Let us know on <a href={ config.discord }>Discord</a>.
