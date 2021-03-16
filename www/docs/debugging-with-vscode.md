---
id: debugging-with-vscode
title: Debugging with Visual Studio Code
sidebar_label: Debugging with VS Code
description: "Debugging a Serverless Stack (SST) app with breakpoints in Visual Studio Code"
---

import useBaseUrl from "@docusaurus/useBaseUrl";

The [Live Lambda Development](live-lambda-development.md) environment runs a Node.js process locally. This allows you to use [Visual Studio Code](https://code.visualstudio.com) to debug your serverless apps live.

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

Next, head over to the **Run And Debug** tab and click **JavaScript Debug Terminal**.

<img alt="VS Code Run and Debug tab" src={useBaseUrl("img/screens/vs-code-run-and-debug-tab.png")} />

Now you can set a breakpoint, run `npm start`, and trigger your Lambda function. VS Code will stop at your breakpoint.

<img alt="VS Code Lambda function breakpoint" src={useBaseUrl("img/screens/vs-code-lambda-function-breakpoint.png")} />

Note that, by default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So you might have to increase it by setting the [`timeout`](constructs/Function.md#timeout) prop. Automatically increasing this timeout is on the roadmap. If you'd like to see this feature implemented, please [upvote it over on GitHub](https://github.com/serverless-stack/serverless-stack/discussions/176).
