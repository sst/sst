---
description: "Overview of the `function` module."
---

Overview of the `function` client in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/function"
```

The `function` client has the following exports. 

---

## Function

This module helps with accessing [`Function`](../constructs/Function.md) constructs.

```ts
import { Function } from "@serverless-stack/node/function";
```

### functionName

_Type_ : <span class="mono">string</span>

The name of the Lambda function.

```ts
console.log(Function.myFunction.functionName);
```