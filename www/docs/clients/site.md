---
description: "Overview of the `site` module."
---

Overview of the `site` module in the `sst/node` package.

```ts
import { ... } from "sst/node/site"
```

The `site` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### StaticSite

This module helps with accessing [`StaticSite`](../constructs/StaticSite.md) constructs.

```ts
import { StaticSite } from "sst/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(StaticSite.myWeb.url);
```

---

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(ReactStaticSite.myWeb.url);
```

---

### NextjsSite

This module helps with accessing [`NextjsSite`](../constructs/NextjsSite.md) constructs.

```ts
import { NextjsSite } from "sst/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(NextjsSite.myWeb.url);
```

---

### RemixSite

This module helps with accessing [`RemixSite`](../constructs/RemixSite.md) constructs.

```ts
import { RemixSite } from "sst/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(RemixSite.myWeb.url);
```
