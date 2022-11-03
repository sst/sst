---
description: "Overview of the `bucket` module."
---

Overview of the `bucket` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/bucket"
```

The `bucket` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Bucket

This module helps with accessing [`Bucket`](../constructs/Bucket.md) constructs.

```ts
import { Bucket } from "@serverless-stack/node/bucket";
```

#### bucketName

_Type_ : <span class="mono">string</span>

The name of the S3 bucket.

```ts
console.log(Bucket.myBucket.bucketName);
```
