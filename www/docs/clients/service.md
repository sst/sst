---
description: "Overview of the `service` module."
---

Overview of the `service` module in the `sst/node` package.

```ts
import { ... } from "sst/node/service"
```

The `service` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Service

This module helps with accessing [`Service`](../constructs/Service.md) constructs.

```ts
import { Service } from "sst/node/service";
```

#### customDomainUrl

_Type_ : <span class="mono">string</span>

If the custom domain is enabled, this is the URL of the website with the custom domain.

```ts
console.log(Service.myService.customDomainUrl);
```

#### url

_Type_ : <span class="mono">string</span>

The CloudFront URL of the website.

```ts
console.log(Service.myService.url);
```
