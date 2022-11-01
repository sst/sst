---
description: "Overview of the `topic` module."
---

Overview of the `topic` client in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/topic"
```

The `topic` client has the following exports. 

---

## Topic

This module helps with accessing [`Topic`](../constructs/Topic.md) constructs.

```ts
import { Topic } from "@serverless-stack/node/topic";
```

### topicName

_Type_ : <span class="mono">string</span>

The name of the SNS topic.

```ts
console.log(Topic.myTopic.topicName);
```