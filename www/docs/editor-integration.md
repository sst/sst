---
title: Editor Integration
description: SST is designed to integrate really well with your code editor.
---

import styles from "./video.module.css";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is designed to integrate really well with your code editor.

</HeadlineText>

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/pfMeaPyPydo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

It features built-in support for setting breakpoints in your Lambda functions, autocomplete, inline docs, and type checking. We'll be focussing on [VS Code](https://code.visualstudio.com) here but you can do the same with other popular IDEs as well.

---

## Breakpoints

With [Live Lambda Development](live-lambda-development.md) you can set breakpoints in your Lambda functions and test them locally.

:::info
To setup breakpoint debugging in WebStorm or IntelliJ, follow these docs:

- [WebStorm](live-lambda-development.md#debugging-with-webstorm)
- [IntelliJ IDEA](live-lambda-development.md#debugging-with-intellij-idea)

:::

For [VS Code](https://code.visualstudio.com) you'll find a **`launch.json`** file in the `.vscode` directory in your projects. It **hooks up** Live Lambda Dev with VS Code **automatically**.

![VS Code breakpoint triggered](/img/breakpoint-debugging/breakpoint-triggered.png)

You can then open the **Run and Debug** tab and click **Start Debugging** to set breakpoints.

---

## Type checking

SST is a TypeScript-first framework. SST projects are configured so that VS Code will **automatically** pick up the config and **typecheck** your code as you write it. This helps you fix issue early.

![VS Code Typesafe](/img/editor-setup/vs-code-typesafe.png)

---

## Autocomplete

As you are typing, VS Code will also autocomplete the property names in your SST code. You can also press `CTRL + SPACE` to bring up the autocomplete menu.

![VS Code autocomplete](/img/editor-setup/vs-code-autocomplete.png)

These are thanks to the great TypeScript and TSDoc support that SST has.

---

## Inline docs

You can also find examples docs for each property by hovering your mouse over it.

![VS Code TS Doc](/img/editor-setup/vs-code-tsdoc.png)
