---
description: "Overview of the `table` module."
---

Overview of the `table` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/table"
```

The `table` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Table

This module helps with accessing [`Table`](../constructs/Table.md) constructs.

```ts
import { Table } from "@serverless-stack/node/table";
```

#### tableName

_Type_ : <span class="mono">string</span>

The name of the DynamoDB table.

```ts
console.log(Table.myTable.tableName);
```
