---
description: "Overview of the `rds` module."
---

Overview of the `rds` client in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/rds"
```

The `rds` client has the following exports. 

---

## RDS

This module helps with accessing [`RDS`](../constructs/RDS.md) constructs.

```ts
import { RDS } from "@serverless-stack/node/rds";
```

### clusterArn

_Type_ : <span class="mono">string</span>

The ARN of the RDS Serverless Cluster.

```ts
console.log(RDS.myDatabase.clusterArn);
```

### secretArn

_Type_ : <span class="mono">string</span>

The ARN of the Secrets Manager Secret for the RDS Serverless Cluster.

```ts
console.log(RDS.myDatabase.secretArn);
```

### defaultDatabaseName

_Type_ : <span class="mono">string</span>

The default database name of the RDS Serverless Cluster.

```ts
console.log(RDS.myDatabase.defaultDatabaseName);
```