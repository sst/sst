---
description: "Docs for how size are handled in the @serverless-stack/resources"
---

SST makes it easy to specify size values as typed string values.

_Type_ : <span class="mono">${number} MB</span> | <span class="mono">${number} GB</span>

## Examples

### Function memory size

```js {3}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  memorySize: "512 MB",
});
```

### Function disk size

```js {3}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  diskSize: "5 GB",
});
```