---
id: database-options
title: Database Options
description: "Database Options of an SST app"
---

By default the starter creates an [AWS RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) setup that can operate in Postgres or MySQL mode and is optimized for a serverless usecase. However, thanks to [DDD](./domain-driven-design.md) you can use any database you want or combine various databases for different parts of your application.

Here's how to think about what to use

### RDS

RDS is a fully managed database offering from AWS. Additionally, SST provisions a serverless flavor of it. While it is considered serverless, it's more of an effort to take a traditional DB and make it scale more automatically and does not have the same power as serverless-first databases.

#### Pros
- Familiar relational model with Postgres or MySQL engines
- Can scale to 0 in dev environments

#### Cons
- Not designed for serverless so will run into traditional scaling issues
- VPC requirements create some rough edges in certain workflows
- Autoscaling is slow

### DynamoDB

DynamoDB is a NoSQL database offering from AWS. It is extremely performant and works extremely well with serverless-first systems. It's what we at SST use internally on our own projects and the only reason it's not the default in the starter is there's a bit of a learning curve which may be difficult if you're also new to serverless.

Note, DynamoDB still supports relational data so it can be used for most use cases.

#### Pros
- Can scale to 0 when not being used
- Single digit millisecond performance
- Consistent performance at any scale

#### Cons
- Need to learn Single Table Design which is the preferred way to use DynamoDB

If you'd like to use it, and we encourage you to try, you can skip ahead to [insert chapter](.)

### Other

You're free to use other non-AWS databases if you'd like. We don't currently provide any native constructs for things like Planetscale or Mongo but we do have the following examples:

- link to the MongoDB example
- link to the Planet Scale example
