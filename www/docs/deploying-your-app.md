---
id: deploying-your-app
title: Deploying Your App
description: "How to deploy your Serverless Stack Toolkit (SST) app"
---

Once your app has been built and tested successfully. You are ready to deploy it to AWS.

## Deploying an app

```bash
# With npm
npx sst deploy
# Or with Yarn
yarn sst deploy
```

This command uses your **default AWS Profile**. And the **region** and **stage** specified in your `sst.json`.

### Deploying to a stage

By default, the stacks in a CDK app can be deployed to multiple AWS accounts and regions. This doesn't work well when trying to support a separate development environment. Like the one `sst start` creates.

To fix this, SST has the notion of stages. An SST app can be deployed separately to multiple environments (or stages). A stage is simply a string to distinguish one environment from another. The default stage and region of an app are specified in the app's `sst.json`.

Behind the scenes, SST uses the name of the app and stage to prefix the resources in the app. This ensures that if an app is deployed to two different stages in the same AWS account; the resource names will not thrash. You can also prefix resource names in your stacks by calling the [`logicalPrefixedName`](constructs/app.md#logicalprefixedname) method in [`sst.App`](constructs/app.md).

```js
this.node.root.logicalPrefixedName("MyResource"); // "dev-my-sst-app-MyResource"
```

So if you want to deploy to a stage called prod.

```bash
npx sst deploy --stage prod
```

And if you prod environment is in a different AWS account or region, you can do:

```bash
AWS_PROFILE=my-profile npx sst deploy --stage prod --region eu-west-1
```

:::note
If you are using `npm run deploy`, you'll need to add an extra `--` for the options.
:::

For example, to set the stage and region:

```bash
npm run deploy -- --stage prod --region eu-west-1
```

## Removing an app

Finally, you can remove all your stacks and their resources from AWS using.

```bash
# With npm
npx sst remove
# Or with Yarn
yarn sst remove
```

Or if you've deployed to a different stage.

```bash
npx sst remove --stage prod
```

Note that, this command permanently removes your resources from AWS. It also removes the stack that's created as a part of the debugger.
