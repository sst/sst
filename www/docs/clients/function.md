---
description: "Overview of the `function` module."
---

Overview of the `function` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/function"
```

The `function` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Function

This module helps with accessing [`Function`](../constructs/Function.md) constructs.

```ts
import { Function } from "@serverless-stack/node/function";
```

#### functionName

_Type_ : <span class="mono">string</span>

The name of the Lambda function.

```ts
console.log(Function.myFunction.functionName);
```
