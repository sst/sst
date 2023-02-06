---
description: "Overview of the `function` module."
---

Overview of the `function` module in the `sst/node` package.

```ts
import { ... } from "sst/node/function"
```

The `function` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Function

This module helps with accessing [`Function`](../constructs/Function.md) constructs.

```ts
import { Function } from "sst/node/function";
```

#### functionName

_Type_ : <span class="mono">string</span>

The name of the Lambda function.

```ts
console.log(Function.myFunction.functionName);
```
