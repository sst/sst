---
title: Editor Integration
---

With SST we really care about your local development experience. So we designed it to integrate really well with your code editor. In this chapter we'll take a quick tour of what this looks like.

:::info
SST is designed to integrate really well with your code editor.
:::

We'll be focussing on [VS Code](https://code.visualstudio.com) here but you can do the same with other popular IDEs as well.

---

## Breakpoint debugging

We mentioned [Live Lambda Development](../live-lambda-development.md) in the past chapters. It allows you to set breakpoints in your Lambda functions and test them locally. It does this by proxying requests from AWS directly to your local machine and executing them locally.

For [VS Code](https://code.visualstudio.com) you'll find a `launch.json` file in the `.vscode` directory. It hooks up Live Lambda Dev with VS Code automatically.

:::note
If you are using WebStorm or IntelliJ, you can follow [this doc](../live-lambda-development.md#debugging-with-webstorm) to get set up.
:::

Don't worry about trying it out right now, we'll go through that in an upcoming chapter.

---

## Autocomplete

As you are typing, VS Code will autocomplete the property names in your SST code. You can also press `CTRL + SPACE` to bring up the autocomplete menu.

![VS Code autocomplete](/img/editor-setup/vs-code-autocomplete.png)

These are thanks to the great TypeScript and TSDoc support that SST has.

---

## Inline examples

You can also find examples for each property by hovering your mouse over it.

![VS Code TS Doc](/img/editor-setup/vs-code-tsdoc.png)

---

## Typesafety

SST is a TypeScript-first framework. So your IDE finds problems in your code as you write it. This helps you fix them early.

![VS Code Typesafe](/img/editor-setup/vs-code-typesafe.png)

---

That concludes our little code editor integration tour. By now your `sst start` process should be complete.

So let's run our first migration and initialize our database!
