---
description: "Docs for how size are handled in the @serverless-stack/resources"
---

:::caution
This is the SST v1.x Constructs doc. SST v2 is now released. If you are using v2, see the [v2 Constructs doc](/constructs). If you are looking to upgrade to v2, [check out the upgrade steps](/upgrade-guide#upgrade-to-v20).
:::

SST makes it easy to specify size values as typed string values.

_Type_ : <span class="mono">${number} MB</span> | <span class="mono">${number} GB</span>

## Examples

### Function memory size

```js {3}
new Function(this, "MyFunction", {
  handler: "src/lambda.main",
  memorySize: "512 MB",
});
```

### Function disk size

```js {3}
new Function(this, "MyFunction", {
  handler: "src/lambda.main",
  diskSize: "5 GB",
});
```