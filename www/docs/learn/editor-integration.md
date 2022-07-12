---
title: Editor Integration
---

SST is designed to integrate really well with your code editor. So in this chapter we'll take a quick tour of what this looks like!

:::info
SST integrates really well with your code editor to give you a great local development experience.
:::

We'll be focussing on [VS Code](https://code.visualstudio.com) here but you can do the same with other popular IDEs as well.


## 1. Breakpoint debugging

First up, is setting break points and testing your apps locally. We mentioned [Live Lambda Development](../live-lambda-development.md) in the past chapters. It allows you to set breakpoints in your Lambda functions and test them locally. It does this by proxying requests from AWS directly to your local machine and executing them locally. You can [read about this in detail over here](../live-lambda-development.md).

For [VS Code](https://code.visualstudio.com) you'll find a `launch.json` file in the `.vscode` folder. It hooks up Live Lambda Dev with VS Code automatically. Don't worry about trying it out right now, we'll go through that in an upcoming chapter.

:::note
If you are using WebStorm or IntelliJ, you can follow [these instructions](../live-lambda-development.md#debugging-with-webstorm) to get set up.
:::

## 2. Auto-complete

As you are typing, VS Code will auto-complete the property names in your SST code. You can also press `CTRL + SPACE` to bring up the auto-complete menu.

![VS Code auto-complete](/img/editor-setup/vs-code-auto-complete.png)

These are thanks to the great TypeScript support that SST has.

## 3. Inline examples

You can also find examples for each property by hovering your mouse over the it.

![VS Code TS Doc](/img/editor-setup/vs-code-tsdoc.png)

## 4. Type-safety

SST is a TypeScript-first framework. So your IDE finds problems in your code as you write it. This helps you fix them early.

![VS Code Typesafe](/img/editor-setup/vs-code-typesafe.png)

That concludes our little code editor integration tour. By now your `sst start` process should be complete.

So let's run our first migration and initialize our database!
