---
title: Deploy from CLI
---

import ChangeText from "@site/src/components/ChangeText";

Once you are ready to go live with real users, you can deploy it to production.

### Deploy to prod

Stop the `npx sst start` process in the CLI. And run this instead.

<ChangeText>

```bash
npx sst deploy --stage prod
```

</ChangeText>

Make sure to run it at the root of the project.

The key difference here is that we are passing in a `stage` for the command. You might recall from the [Create a New Project](create-a-new-project.md#start-live-lambda-dev) chapter that SST uses the stage to namespace the resources it creates.

So running `sst deploy` with `--stage prod` is creating a new instance of your application and separates it from the one you are using for development.

INSERT SCREENSHOT

<!--
![App deployed to prod](/img/deploy-from-cli/app-deployed-to-prod.png)
-->

You'll notice here that the URL the app is deployed to is different from the one we had locally.

In fact, we recommend separating these resources further by deploying to separate AWS accounts using something like:

```bash
AWS_PROFILE=prod-profile npx sst deploy --stage prod
```

Where `prod-profile` is a separate set of [AWS credentials](../advanced//iam-credentials.md#loading-from-a-file) stored locally.

### Manage in prod

After your app is deployed to prod, you can use the [SST Console](../console.md) to manage it as well.

Run the following from the root of the project.

```bash
npx sst console --stage prod
```

This will start up the SST Console and connect it to the given `stage`.

The Console won't have the **Local** tab as the functions are not running locally anymore. Instead it'll you can view the CloudWatch logs for your functions.

Next let's set it up so that you can simply git push to deploy your app.
