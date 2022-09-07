---
title: Database Options
---

Before we can save our comments to the database, let's quickly look at the serverless database options. Hopefully this chapter gives you a sense of what you should use in your apps.

Let's start by looking at the two options the `create sst` setup supports out of the box.

### RDS

[RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) is a fully-managed database offering from AWS. SST provisions a serverless flavor of it with the [`RDS`](../constructs/RDS.md) construct. RDS will automatically scale up and down based on the load it's experiencing.

:::note
Serverless RDS can take a few minutes to autoscale up and down.
:::

While it's considered _"serverless"_, it's more of an effort to take a traditional database and make it scale automatically. Unfortunately it doesn't have the same power as _serverless-first_ databases.

#### Pros

- Familiar relational model with PostgreSQL or MySQL engines.
- Can scale to 0 in dev environments.

#### Cons

- Doesn't help when dealing with scale. You need to manage indexes, optimize slow queries, and shard tables when they get too big.
- Autoscaling is slow. It can take anywhere from a couple of minutes to around 15 minutes to repond to increased load and scale up.
- VPC requirements create some rough edges in certain workflows.

### DynamoDB

[DynamoDB](https://aws.amazon.com/dynamodb/) is a NoSQL database offering from AWS. It's extremely performant and works extremely well with serverless-first systems.

:::info
The SST team uses DynamoDB internally.
:::

The only reason it's not the default in the `create sst` setup is because there's a bit of a learning curve. If you are new to serverless, this could be one extra thing you'll need to learn.

That said, DynamoDB supports relational data, it's not just a pure key/value store. It should support most use cases. But you'll need to learn how to model your relational data in it. And it doesn't support JOINs or other more advanced relational data queries.

#### Pros

- Can scale to 0 when not being used.
- Single-digit millisecond performance.
- Consistent performance at any scale.

#### Cons

- Need to learn [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/) to model data in DynamoDB.

### Other options

There are also other non-AWS database options; like [PlanetScale](https://planetscale.com) and [MongoDB](https://www.mongodb.com). Currently, these aren't a part of the `create sst` setup. But we do have examples that can help you get started with them:

- [Example using MongoDB](https://serverless-stack.com/examples/how-to-use-mongodb-atlas-in-your-serverless-app.html)
- [Example using PlanetScale](https://serverless-stack.com/examples/how-to-use-planetscale-in-your-serverless-app.html)

---

In the next two chapters we'll be walking through how to use [RDS with PostgreSQL](write-to-the-database.md) and [DynamoDB](write-to-dynamodb.md) to store our new comments feature.

An important consequence of [Domain Driven Design](domain-driven-design.md) is that we can completely separate our database choice from the rest of the app. So you can pick the chapter you want and the rest of the tutorial works in exactly the same way.

Though we do recommend skimming through the option you aren't using. It'll give you a feel for what the experience is like.
