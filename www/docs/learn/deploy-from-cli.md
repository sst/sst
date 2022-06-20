---
id: deploy-from-cli
title: Deploying from CLI
description: "Deploying an SST app to Production"
---

Once you are ready to go live with real users, you can deploy your SST app to a live stage.

## Deploy app

```bash
AWS_PROFILE=prod-profile npx sst deploy --stage prod
```

Note that it is recommended to use different AWS accounts for local development and for production. If you are using the same AWS account, you can omit `AWS_PROFILE=prod-profile`.

It is also recommended to not use the same stage used by `sst start`, and always pass in a stage name when deploying.

You can read more about stage names and the best practices when working with your team [here](working-with-your-team).

## Manage app

```bash
AWS_PROFILE=prod-profile npx sst console --stage prod
```

This will start up SST Console in live mode. The console won't have the Local tab as the functions for deployed apps are not run locally. But you can use it to manage your app.