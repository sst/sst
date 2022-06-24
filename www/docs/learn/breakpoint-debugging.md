---
title: Breakpoint Debugging
---

We now have our entire app; frontend and backend running locally. Before we start working on our app, let's look at how we'd go about debugging it.

[Live Lambda Dev](../live-lambda-development.md) allows you debug Lambda functions locally by setting  breakpoints. Let's see it action!

Open the `services/core/article.ts` file and set a breakpoint in the `list` function.

![VS Code set breakpoint](/img/breakpoint-debugging/set-breakpoint.png)

This function is called by our GraphQL API to get the list of all the articles that've been submitted.

Let's switch over to debugging through VS Code. Stop the `sst start` process that is running in your terminal.

Then select the `Run and Debug` tab on the left in VS Code, and click `Start Debugging` at the top.

![VS Code start debugging](/img/breakpoint-debugging/start-debugging.png)

Go back to our frontend and refresh page opened. You should see it hit our  breakpoint.

![VS Code breakpoint triggered](/img/breakpoint-debugging/breakpoint-triggered.png)

Here you can browse the values of the variables in our code. You can also inspect the call stack leading up to the function call.

Click `Continue` to resume the execution.

![VS Code resume](/img/breakpoint-debugging/resume.png)

Now we are ready to start working on our app! 
