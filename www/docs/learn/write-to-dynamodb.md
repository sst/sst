---
title: Write to DynamoDB
---

Skip this chapter if you are using RDS.

If you have not created the list and create comments functions, go read Database Options.

## Overview

DynamoDB is an excellent choice to use in serverless architectures. However, it is quite different than more familiar databases like Postgres and is best used with a pattern called [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/).

The details of Single Table Design can be a bit of work to learn but `create-sst` ships with an excellent library called [ElectroDB](https://github.com/tywalch/electrodb) that provides a simplified way of implementing it. While you should eventually dig deeper and learn the underlying patterns, ElectroDB helps you quickly get started and scales well to the most advanced patterns.

## Using DynamoDB

### Remove RDS
`create-sst` comes with both RDS and DynamoDB configured. If you are building with DynamoDB you will want to remove the following line from your stacks code to prevent an RDS cluster from being provisioned.

```js {2}
app
  .stack(Relational)
  .stack(Dynamo)
  ...etc
```

### Implementing Articles

`create-sst` by default comes with an RDS implementation of the example articles module. Let's start by clearing out the current code.

```js
export * as Article from "./article";

import { ulid } from "ulid";

export async function create(title: string, url: string) {
}

export async function list() {
}
```

Now we can create an ElectroDB entity that represents the article. Note this references the generic schema defined in `stacks/Dynamo.ts`
