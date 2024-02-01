---
title: Connecting via Proxy
description: "Setting up HTTP proxy in your SST app."
---

SST uses the [global-agent](https://www.npmjs.com/package/global-agent) package to connect to a proxy for outgoing http requests.

:::info
You have to install `global-agent` as a dependency in your `package.json`.
```bash
npm install --save-dev global-agent
```
:::

---

## Configure HTTPS proxy

To configure HTTPS proxy, set one of the following environment variables:
-  GLOBAL_AGENT_HTTPS_PROXY
-  https_proxy
-  HTTPS_PROXY

```bash
GLOBAL_AGENT_HTTPS_PROXY='https://127.0.0.1:8001'
```

---

## Configure HTTP proxy

Similarly to configure HTTP proxy, set one of the following environment variables:
-  GLOBAL_AGENT_HTTP_PROXY
-  http_proxy
-  HTTP_PROXY

```bash
GLOBAL_AGENT_HTTP_PROXY='http://127.0.0.1:8001'
```

---

## Exclude URLs

You can also specify a pattern of URLs that should be excluded from proxying by setting one of the following environment variables:
- GLOBAL_AGENT_NO_PROXY
- no_proxy
- NO_PROXY

```bash
GLOBAL_AGENT_NO_PROXY='*.foo.com,baz.com'
```

You can [read more about fine-grained control of the proxy settings](https://www.npmjs.com/package/global-agent).
