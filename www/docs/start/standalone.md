---
id: standalone
sidebar_label: Standalone
title: Create a Standalone SST App
description: "Create and deploy your first SST app."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

Take SST for a spin and create your first project.

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 18](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

:::tip
If you are new to SST, we recommend you start with our latest version instead. [**Learn more about Ion**](https://ion.sst.dev/docs/).
:::

---

## 1. Create a new app

Create a new SST app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest my-sst-app
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst my-sst-app
```

</TabItem>
</MultiPackagerCode>

Install the SST app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
yarn install
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm install
```

</TabItem>
</MultiPackagerCode>

Start your [local dev environment](live-lambda-development.md).

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst dev
```

</TabItem>
</MultiPackagerCode>

This will give you an API endpoint like — `https://m69caok4q0.execute-api.us-east-1.amazonaws.com`.

---

## 2. Edit the API

Let's make a change to our API. Replace the following in `packages/functions/src/lambda.ts`.

```diff title="packages/functions/src/lambda.ts"
export const handler = ApiHandler(async (_evt) => {
  return {
-   body: `Hello world. The time is ${new Date().toISOString()}`,
+   statusCode: 200,
+   body: `Hi from SST ${new Date().toISOString()}`,
  };
});
```

Now if you hit your API again, you should see the new message!

---

## 3. Add a frontend

Let's now add a frontend to our app.

---

#### Create a new Vite React app

Run the following in `packages/` and name your project `web`.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm create vite@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create vite
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create vite
```

</TabItem>
</MultiPackagerCode>

Add it to your stacks and link the API to it.

```ts title="stacks/MyStack.ts" {6}
const web = new StaticSite(stack, "web", {
  path: "packages/web",
  buildOutput: "dist",
  buildCommand: "npm run build",
  environment: {
    VITE_APP_API_URL: api.url,
  },
});
```

---

#### Call your API

Start Vite locally and bind SST to it by running in `packages/web`.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst bind vite
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst bind vite
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst bind vite
```

</TabItem>
</MultiPackagerCode>

Make a call to the API in your React app. Replace the `App` component in `src/App.tsx`.

```tsx title="packages/web/src/App.tsx" {5}
function App() {
  const [message, setMessage] = useState("Hi 👋");

  function onClick() {
    fetch(import.meta.env.VITE_APP_API_URL)
      .then((response) => response.text())
      .then(setMessage);
  }

  return (
    <div className="App">
      <div className="card">
        <button onClick={onClick}>
          Message is "<i>{message}</i>"
        </button>
      </div>
    </div>
  );
}
```

---

## 4. Deploy to prod

Let's end with deploying our app to production.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst deploy --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

:::info
[View the source](https://github.com/sst/sst/tree/master/examples/quickstart-standalone) for this example on GitHub.
:::

---

## 5. Manage in prod

You can use the [SST Console](console.md) to view logs and issues in prod. **<a href={config.console}>Create a free account</a>** and connect it to AWS.

![SST app in the SST Console](/img/start/sst-app-in-the-sst-console.png)

---

## Next steps

1. Learn more about SST
   - [`Api`](../constructs/Api.md) — Add an API to your app
   - [`StaticSite`](../constructs/StaticSite.md) — Deploy a static site to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
   - [Resource Binding](../resource-binding.md) — Typesafe access to your resources
2. Ready to dive into the details of SST? <a href={config.guide}>**Check out our guide**</a>.
