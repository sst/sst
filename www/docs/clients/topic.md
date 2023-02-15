---
description: "Overview of the `topic` module."
---

Overview of the `topic` module in the `sst/node` package.

```ts
import { ... } from "sst/node/topic"
```

The `topic` module has the following exports.

---

## Topic

This module helps with accessing [`Topic`](../constructs/Topic.md) constructs.

```ts
import { Topic } from "sst/node/topic";
```

### topicName

_Type_ : <span class="mono">string</span>

The name of the SNS topic.

```ts
console.log(Topic.myTopic.topicName);
```
