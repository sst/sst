---
id: debugging-with-vscode
title: Debugging with Visual Studio Code
sidebar_label: Debugging with VS Code
description: "Debugging a Serverless Stack (SST) app with breakpoints in Visual Studio Code"
---

import config from "../config";
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
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/sst",
      "runtimeArgs": ["start", "--increase-timeout"],
      "console": "integratedTerminal",
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
  
  Runs the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions. It also uses the `integratedTerminal` mode to allow you to [_press ENTER_](live-lambda-development.md#cdk-builds) when you need to update your CDK infrastructure.

- **Debug SST Tests**
  
  Runs the `sst test` command in debug mode. Allowing you to set breakpoints in your Jest tests.

## Debug Lambda Functions

Next, head over to the **Run And Debug** tab and for the debug configuration select **Debug SST Start**.

<img alt="VS Code debug SST start" src={useBaseUrl("img/screens/vs-code-debug-sst-start.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

### Increasing Timeouts

By default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So we need to increase this. We use the [`--increase-timeout`](packages/cli.md#options) option for the `sst start` command in our `launch.json`.

``` js title="launch.json
"runtimeArgs": ["start", "--increase-timeout"],
```

This increases our Lambda function timeouts to their maximum value of 15 minutes. For APIs the timeout cannot be increased more than 30 seconds. But you can continue debugging the Lambda function, even after the API request times out.

## Debug Tests

Similarly, you can debug the tests in your project by selecting the **Debug SST Tests** option in the debug configuration dropdown.

<img alt="VS Code debug SST tests" src={useBaseUrl("img/screens/vs-code-debug-sst-tests.png")} />

This allows you to set breakpoints in your tests and debug them.

## Example Project

We have <a href={ `${config.github}/tree/master/examples/vscode` }>an example project</a> with the VS Code setup that you can use as a reference.
