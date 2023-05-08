---
description: "Overview of the `kinesis-stream` module."
---

Overview of the `kinesis-stream` module in the `sst/node` package.

```ts
import { ... } from "sst/node/kinesis-stream"
```

The `kinesis-stream` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### KinesisStream

This module helps with accessing [`KinesisStream`](../constructs/KinesisStream.md) constructs.

```ts
import { KinesisStream } from "sst/node/kinesis-stream";
```

#### streamName

_Type_ : <span class="mono">string</span>

The name of the Kinesis Stream.

```ts
console.log(KinesisStream.myStream.streamName);
```
