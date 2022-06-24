---
title: Going to Production
description: "Learn how to take your SST app to production."
---

Once you are ready to deploy your SST app to production and go live with real users, you should double check a couple of things.

- Make sure the [default removal policy](./constructs/App.md#setting-a-default-removal-policy) is **NOT set to `DESTROY`** for production environments.
- Make sure the **secrets are not stored in the code** and committed to Git. Store the secrets with the [CI provider](environment-variables.md#environment-variables-in-seed) or use [AWS SSM](environment-variables.md#working-with-secrets).
- Review the log retention setting for Lambda function logs and API access logs. Ensure that the number of days the logs are kept in [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html) fits your budget.
- If you'd like extra visibility on your Lambda functions, consider using a [monitoring service](./advanced/monitoring.md) for your functions.
- It's recommended that you and your team **do NOT have permission** to deploy to production environments **from your local machines**. Deployments to production environments should be done from a consistent and secure environment like a CI server.