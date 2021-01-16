---
id: deploying-your-app
title: Deploying Your App
---

Once your app has been built and tested successfully. You are ready to deploy it to AWS.

## Deploying to AWS

```bash
# With npm
npx sst deploy
# Or with Yarn
yarn sst deploy
```

This uses your **default AWS Profile**. And the **region** and **stage** specified in your `sst.json`. You can deploy using a specific AWS profile, stage, and region by running.

```bash
AWS_PROFILE=my-profile npx sst deploy --stage prod --region eu-west-1
```

## Removing an app

Finally, you can remove all your stacks and their resources from AWS using.

```bash
# With npm
npx sst remove
# Or with Yarn
yarn sst remove
```

Note that, this permanently removes your resources from AWS. It also removes the stack that's created as a part of the debugger.
