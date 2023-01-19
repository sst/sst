---
description: "Docs for how length of time are handled in the sst/constructs"
---

SST makes it easy to specify length of time values as typed string values.

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

## Examples

### Function timeout

```js {3}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  timeout: "20 seconds",
});
```

### Api CORS max age

```js {5}
new Api(stack, "MyApi", {
  cors: {
    allowMethods: ["GET"],
    allowOrigins: ["https://domain.com"],
    maxAge: "5 minutes",
  },
});
```
