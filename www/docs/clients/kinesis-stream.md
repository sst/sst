---
description: "Overview of the `kinesis-stream` module."
---

Overview of the `kinesis-stream` client in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/kinesis-stream"
```

The `kinesis-stream` client has the following exports. 

---

## KinesisStream

This module helps with accessing [`KinesisStream`](../constructs/KinesisStream.md) constructs.

```ts
import { KinesisStream } from "@serverless-stack/node/kinesis-stream";
```

### streamName

_Type_ : <span class="mono">string</span>

The name of the Kinesis Stream.

```ts
console.log(KinesisStream.myStream.streamName);
```