---
title: Breakpoint Debugging
---

We now have our entire app; frontend and backend running locally. But we haven't tried debugging it locally. So, let's try doing that.

We are going to see what it's like to set a breakpoint and test your app locally with [Live Lambda Dev](../live-lambda-development.md).

Open `services/core/article.ts` and set a breakpoint in the `list` function.

![VS Code set breakpoint](/img/breakpoint-debugging/set-breakpoint.png)

This function is called by our GraphQL API to get the list of all the articles that've been submitted. So it'll get run when we load our app homepage.

We currently have `sst start` running in our terminal. Let's switch over to debugging through VS Code. First, stop the `sst start` process.

Then select the **Run and Debug** tab in the top left menu in VS Code, and click **Start Debugging** at the top.

![VS Code start debugging](/img/breakpoint-debugging/start-debugging.png)

Go back to our frontend and refresh the homepage. You should see it hit our breakpoint.

![VS Code breakpoint triggered](/img/breakpoint-debugging/breakpoint-triggered.png)

Now you can browse the values of the variables in our code. You can also inspect the call stack leading up to the function call.

:::info
Breakpoints show you the real Lambda function event, not a locally mocked version.
:::

Finally, hit **Continue** to resume the execution.

![VS Code resume](/img/breakpoint-debugging/resume.png)

Now that you have a good idea of what the local development environment for SST feels like, let's start working on our app!
