---
description: "Overview of the `api` module."
---

Overview of the `api` module in the `sst/node` package.

```ts
import { ... } from "sst/node/api"
```

The `api` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Api

This module helps with accessing [`Api`](../constructs/Api.md) constructs.

```ts
import { Api } from "sst/node/api";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

```ts
console.log(Api.myApi.url);
```

---

### AppSyncApi

This module helps with accessing [AppSyncApis](../constructs/AppSyncApi.md).

```ts
import { AppSyncApi } from "sst/node/api";
console.log(AppSyncApi.myApi.url);
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

### WebSocketApi

This module helps with accessing [WebSocketApis](../constructs/WebSocketApi.md).

```ts
import { WebSocketApi } from "sst/node/api";
console.log(WebSocketApi.myApi.url);
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

### ApiGatewayV1Api

This module helps with accessing [ApiGatewayV1Apis](../constructs/ApiGatewayV1Api.md).

```ts
import { ApiGatewayV1Api } from "sst/node/api";
console.log(ApiGatewayV1Api.myApi.url);
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

## Handlers

The handlers can wrap around your Lambda function handler.

---

### ApiHandler

The `ApiHandler` provides a function that can be used to implement the API handler function.

```js
import { useBody, ApiHandler } from "sst/node/api";

export const handler = ApiHandler((event) => {
  const body = useBody();

  // ...
});
```

---

## Hooks

The hooks are functions that have access to the current invocation.

---

### useBody

This hook returns the request body.

```ts
import { useBody } from "sst/node/api";
const body = useBody();
```

---

### useJsonBody

This hook returns the request body in JSON decoded format.

```ts
import { useJsonBody } from "sst/node/api";
const json = useJsonBody();
```

---

### useCookie

This hook returns a request cookie.

```ts
import { useCookie } from "sst/node/api";
const cookie = useCookie("token");
```

---

### useCookies

This hook returns all request cookies.

```ts
import { useCookies } from "sst/node/api";
const cookies = useCookies();
```

---

### useHeader

This hook returns a request header. Header names are parsed to lowercase.

```ts
import { useHeader } from "sst/node/api";
const header = useHeader("authorization");
```

---

### useHeaders

This hook returns all request headers.

```ts
import { useHeaders } from "sst/node/api";
const headers = useHeaders();
```

---

### useFormData

This hook returns the request form data.

```ts
import { useFormData } from "sst/node/api";
const data = useFormData();
```

---

### useFormValue

This hook returns the request form value.

```ts
import { useFormValue } from "sst/node/api";
const name = useFormValue("name");
```

---

### useQueryParam

This hook returns a request query parameter.

```ts
import { useQueryParam } from "sst/node/api";
const name = useQueryParam("name");
```

---

### useQueryParams

This hook returns all request query parameters.

```ts
import { useQueryParams } from "sst/node/api";
const params = useQueryParams();
```

---

### usePathParam

This hook returns a request path parameter.

```ts
import { usePathParam } from "sst/node/api";
const id = usePathParam("id");
```

---

### usePathParams

This hook returns all request query parameters.

```ts
import { usePathParams } from "sst/node/api";
const params = usePathParams();
```
