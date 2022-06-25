---
title: Database Options
---

Because of [DDD](domain-driven-design.md) you can use any database you want, or combine various databases for different parts of your application. Before we save our comments to the database, let's compare the two popular serverless database options.

### RDS

[RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) is a fully-managed database offering from AWS. SST provisions a serverless flavor of it. While it is considered serverless, it's more of an effort to take a traditional DB and make it scale automatically and it doesn't have the same power as serverless-first databases.

#### Pros

- Familiar relational model with PostgreSQL or MySQL engines.
- Can scale to 0 in dev environments.

#### Cons

- Not designed for serverless, so will run into traditional scaling issues.
- VPC requirements create some rough edges in certain workflows.
- Autoscaling is slow.

### DynamoDB

[DynamoDB](https://aws.amazon.com/dynamodb/) is a NoSQL database offering from AWS. It's extremely performant and works extremely well with serverless-first systems. It's what we at SST use internally for our own projects. The only reason it's not the default in the starter is there's a bit of a learning curve. This can be hard to deal with if you're also new to serverless.

:::note
DynamoDB still supports relational data so it can be used for most use cases.
:::

#### Pros

- Can scale to 0 when not being used.
- Single digit millisecond performance.
- Consistent performance at any scale.

#### Cons

- Need to learn Single Table Design, the preferred way to use DynamoDB.

### Other options

You're free to use other non-AWS databases if you'd like. We don't currently provide any native constructs for services like PlanetScale or MongoDB, but we do have the following examples:

- [Example using MongoDB](https://serverless-stack.com/examples/how-to-use-mongodb-atlas-in-your-serverless-app.html)
- [Example using PlanetScale](https://serverless-stack.com/examples/how-to-use-planetscale-in-your-serverless-app.html)

Next, let's use RDS to store our comments.
