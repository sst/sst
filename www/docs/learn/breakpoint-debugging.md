---
id: breakpoint-debugging
title: Breakpoint Debugging [J]
description: "Breakpoint debugging for an SST app"
---

Live Lambda Debug allows you debug with breakpoint in your Lambda code.

Open up `api/core/article.ts` and set a breakpoint in the `list` function.

![](/img/breakpoint-debugging/set-breakpoint.png)

Stop the `sst start` process that is running. We need to restart the process from within VS Code.

Select the `Run and Debug` tab on the left, and select the `Start Debugging` at the top.

![](/img/breakpoint-debugging/start-debugging.png)

Refresh page opened in the browser, you should see the breakpoint is triggered.

![](/img/breakpoint-debugging/breakpoint-triggered.png)

You can browse the values of variables at the point in time, as well as inspect the call stack leading up to the function call.

Hit `Continue` to resume the execution.

![](/img/breakpoint-debugging/resume.png)