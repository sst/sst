---
id: editor-setup
title: Editor Setup [J]
description: "Editor setup for an SST app"
---

[Live Lambda Development](live-lambda-development) offers a really awesome local development environment that lets you use breakpoints to debug your functions in your favorite IDE, while the functions are invoked remotely by resources in AWS.

## Breakpoint Debugging

VS Code is one of the most popular editors in use today. You will find a `launch.json` file at the project root. It hooks up the Live Lambda Development with VS Code automatically and enables breakpoint debugging.

If you are using WebStorm or IntelliJ, you can follow [these instructions](live-lambda-development#debugging-with-webstorm) to setup breakpoint debugging.

## Auto-complete

As you are typing, VS Code will auto-complete the property names. You can also press `CTRL + SPACE` to bring up the auto-complete menu.

![VS Code auto-complete](/img/editor-setup/vs-code-auto-complete.png)

## Inline Examples

You can also find an example on what each property take. Simply hover over the property.

![VS Code TS Doc](/img/editor-setup/vs-code-tsdoc.png)

## Typesafe

SST is designed to be a TypeScript-first framework. Your IDE find problems in your code as you write, helping you fix them early.

![VS Code Typesafe](/img/editor-setup/vs-code-typesafe.png)