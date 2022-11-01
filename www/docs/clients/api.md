---
description: "Overview of the `api` module."
---

Overview of the `api` client in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/api"
```

The `api` client has the following exports. 

---

## Api

This module helps with accessing [`Api`](../constructs/Api.md) constructs.

```ts
import { Api } from "@serverless-stack/node/api";
```

### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

```ts
console.log(Api.myApi.url);
```

---

## GraphQLApi

This module helps with accessing [GraphqlApis](../constructs/GraphQLApi.md).

```ts
import { GraphQLApi } from "@serverless-stack/node/api";
console.log(GraphQLApi.myApi.url);
```

### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

## WebSocketApi

This module helps with accessing [WebSocketApis](../constructs/WebSocketApi.md).

```ts
import { WebSocketApi } from "@serverless-stack/node/api";
console.log(WebSocketApi.myApi.url);
```

### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

## AppSyncApi

This module helps with accessing [AppSyncApis](../constructs/AppSyncApi.md).

```ts
import { AppSyncApi } from "@serverless-stack/node/api";
console.log(AppSyncApi.myApi.url);
```

### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.

---

## ApiGatewayV1Api

This module helps with accessing [ApiGatewayV1Apis](../constructs/ApiGatewayV1Api.md).

```ts
import { ApiGatewayV1Api } from "@serverless-stack/node/api";
console.log(ApiGatewayV1Api.myApi.url);
```

### url

_Type_ : <span class="mono">string</span>

The URL of the API. If custom domain is enabled, this is the custom domain URL of the API.