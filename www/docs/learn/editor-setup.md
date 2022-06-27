---
title: Editor Setup
---

[Live Lambda Development](../live-lambda-development.md) offers a completely local development environment that lets you set breakpoints in your Lambda functions. This lets you  debug your functions in your favorite IDE, while they are invoked remotely in AWS.

## Breakpoint debugging

VS Code is one of the most popular editors in use today. You will find a `launch.json` file at the project root. It hooks up the Live Lambda Development with VS Code automatically and enables breakpoint debugging.

If you are using WebStorm or IntelliJ, you can follow [these instructions](../live-lambda-development.md#debugging-with-webstorm) to configure breakpoint debugging.

## Auto-complete

As you are typing, VS Code will auto-complete the property names in your SST code. You can also press `CTRL + SPACE` to bring up the auto-complete menu.

![VS Code auto-complete](/img/editor-setup/vs-code-auto-complete.png)

## Inline examples

You can also find examples for each property. Simply hover over the property.

![VS Code TS Doc](/img/editor-setup/vs-code-tsdoc.png)

## Typesafe

SST is a TypeScript-first framework. Your IDE finds problems in your code as you write, helping you fix them early.

![VS Code Typesafe](/img/editor-setup/vs-code-typesafe.png)

Next, we'll run our first migration and initialize our database.
