---
id: debugging-with-vscode
title: Debugging with Visual Studio Code
sidebar_label: Debugging with VS Code
description: "Debugging a Serverless Stack (SST) app with breakpoints in Visual Studio Code"
---

import styles from "./video.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

The [Live Lambda Development](live-lambda-development.md) environment runs a Node.js process locally. This allows you to use [Visual Studio Code](https://code.visualstudio.com) to debug your serverless apps live.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/2w4A06IsBlU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

You can also configure VS Code to debug your tests. Let's look at how to set this up.

## Launch Configurations

To set these up, add the following to `.vscode/launch.json`.

```json title="launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug SST Start",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["start"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug SST Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/sst",
      "args": ["test", "--runInBand", "--no-cache", "--watchAll=false"],
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": { "CI": "true" },
      "disableOptimisticBPs": true
    }
  ]
}
```

This contains two launch configurations:

- **Debug SST Start**
  
  Runs the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions. By default this runs the `npm start` script in your `package.json`.
- **Debug SST Tests**
  
  Runs the `sst test` command in debug mode. Allowing you to set breakpoints in your Jest tests.

## Debug Lambda Functions

Next, head over to the **Run And Debug** tab and for the debug configuration select **Debug SST Start**.

<img alt="VS Code debug SST start" src={useBaseUrl("img/screens/vs-code-debug-sst-start.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

Note that, by default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So you might have to increase it. We can use the [App's](constructs/App.md) [`setDefaultFunctionProps`](constructs/App.md#setdefaultfunctionprops) method.

Add this to your `lib/index.js`.

```js {2-6} title="lib/index.js"
export default function main(app) {
  if (process.env.IS_LOCAL) {
    app.setDefaultFunctionProps({
      timeout: 30,
    });
  }

  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here, `IS_LOCAL` is a [built-in environment variable](environment-variables.md#built-in-environment-variables) that's set to true when your app is loaded via `sst start`.

## Debug Tests

Similarly, you can debug the tests in your project by selecting the **Debug SST Tests** option in the debug configuration dropdown.

<img alt="VS Code debug SST tests" src={useBaseUrl("img/screens/vs-code-debug-sst-tests.png")} />

This allows you to set breakpoints in your tests and debug them.

## Example Project

We have [an example project](https://github.com/serverless-stack/examples/tree/main/vscode) with the VS Code setup that you can use as a reference.
