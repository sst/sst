---
id: debugging-with-vscode
title: Debugging with Visual Studio Code
sidebar_label: Debugging with VS Code
description: "Debugging a Serverless Stack (SST) app with breakpoints in Visual Studio Code"
---

import useBaseUrl from "@docusaurus/useBaseUrl";

The [Live Lambda Development](live-lambda-development.md) environment runs a Node.js process locally. This allows you to use [Visual Studio Code](https://code.visualstudio.com) to debug your serverless apps live.

<iframe width="560" height="315" src="https://www.youtube.com/embed/2w4A06IsBlU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

To set this up, add the following to `.vscode/launch.json`.

```json title="launch.json"
{
  "type": "node",
  "request": "launch",
  "name": "Launch via NPM",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["start"],
  "port": 9229,
  "skipFiles": ["<node_internals>/**"]
}
```

This sets it up so that when you run `npm start`, VS Code will automatically attach a debugger to the Node.js process. Allowing you to set breakpoints.

Next, head over to the **Run And Debug** tab and for the debug configuration select **Run Script: start**.

<img alt="VS Code Run and Debug tab" src={useBaseUrl("img/screens/vs-code-run-and-debug-tab.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

Note that, by default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So you might have to increase it by setting the [`timeout`](constructs/Function.md#timeout) prop.

```js {2}
new Function(this, "MyLambda", {
  timeout: 30,
  handler: "sns/index.main",
});
```

And in an [API](constructs/Api.md), you can set the timeout for all the Lambda functions.

```js {3}
new Api(this, "Api", {
  defaultFunctionProps: {
    timeout: 30,
  },
  routes: {
    "GET /": "src/lambda.handler",
  },
});
```

Automatically increasing this timeout is on the roadmap. If you'd like to see this feature implemented, please [upvote it over on GitHub](https://github.com/serverless-stack/serverless-stack/discussions/176).
