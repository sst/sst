---
title: Breakpoint Debugging
---

We now have our entire app; frontend and backend running locally. Let's see what it's like to debug it.

---

## Set a breakpoint

Open `packages/core/src/article.ts` and set a breakpoint in the `list` function.

![VS Code set breakpoint](/img/breakpoint-debugging/set-breakpoint.png)

The `list` domain function is called by our GraphQL API to get the list of all the articles that've been submitted. So it'll get run when we load our app homepage.

We currently have `sst dev` running in our terminal. Let's switch over to debugging through VS Code.

---

## Run and debug

First, stop the `sst dev` CLI.

Then select the **Run and Debug** tab in the top left menu in VS Code, and click **Start Debugging** at the top.

![VS Code start debugging](/img/breakpoint-debugging/start-debugging.png)

Go back to our frontend and refresh the homepage. You should see it hit our breakpoint.

![VS Code breakpoint triggered](/img/breakpoint-debugging/breakpoint-triggered.png)

Now you can browse the values of the variables in our code. You can also inspect the call stack leading up to the function call.

:::info
Breakpoints show you the real AWS Lambda function event.
:::

---

## Continue execution

Once you are done debugging, hit **Continue** to resume the execution.

![VS Code resume](/img/breakpoint-debugging/resume.png)

Now you have a good feel for SST's local development environment. Let's start working on our app!
