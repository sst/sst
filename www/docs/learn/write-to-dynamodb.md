---
title: Write to DynamoDB
---

Skip this chapter if you are using RDS.

If you have not created the list and create comments functions, go read Database Options.

## Using DynamoDB

DynamoDB is an excellent choice to use in serverless architectures. However, it is quite different than more familiar databases like Postgres and is best used with a pattern called [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/).

The details of Single Table Design can be a bit of work to learn but `create-sst` ships with an excellent library called [ElectroDB](https://github.com/tywalch/electrodb) that provides a simplified way of implementing it. While you should eventually dig deeper and learn the underlying patterns, ElectroDB helps you quickly get started and scales well to the most advanced patterns.


Add comments entity to DyanmoDB.

TODO: Should the last two implementation section go into their own chapter?
