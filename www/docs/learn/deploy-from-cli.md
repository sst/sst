---
title: Deploy from CLI
---

Once you are ready to go live with real users, you can deploy your SST app to production.

## Deploy the app

Stop the `npx sst start` process in the CLI. And run this command instead.

```bash
AWS_PROFILE=prod-profile npx sst deploy --stage prod
```

Make sure to run it at the root of the project.

Note that, it's recommended to use different AWS accounts for local development and production. If you are using the same AWS account, you can omit `AWS_PROFILE=prod-profile`.

:::info
It's recommended to not use the same stage as `sst start`, and always pass in a stage name when deploying.
:::

You can [read more](working-with-your-team.md) about stage names and the best practices when working with your team.

## Manage the app

Now that your app is deployed, you can use the SST Console to manage it in production.

Run the following from the root of the project.

```bash
AWS_PROFILE=prod-profile npx sst console --stage prod
```

This will start up the SST Console and connect it to the given `--stage`.

The Console won't have the **Local** tab as the functions are not running locally. But you can still view the logs, and use it to manage the resources in your app.
