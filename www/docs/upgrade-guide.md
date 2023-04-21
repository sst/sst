---
title: Upgrade Guide
description: "Upgrade guide for all notable SST releases."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Upgrade guide for all notable SST releases.

</HeadlineText>

To view the latest release and all historical releases, <a href={`${config.github}/releases`}>head over to our GitHub release page</a>.

---

## Upgrade to v2.3.0

[Resource Binding](resource-binding.md) now lets you bind resources to your frontend frameworks. It simplifies accessing the resources in the server side rendered (SSR) code. For example, here's how we bind the bucket to the Next.js app:

```diff
const bucket = new Bucket(stack, "myFiles");

new NextjsSite(stack, "mySite", {
- environment: {
-   BUCKET_NAME: bucket.bucketName,
- },
- permissions: [bucket],
+ bind: [bucket],
});
```

And here's how we access it in our SSR code.

```diff
+ import { Bucket } from "sst/node/bucket";

- process.env.BUCKET_NAME
+ Bucket.myFiles.bucketName
```

Following are the steps to upgrade.

1. **`sst env` has been renamed to `sst bind`** (although both will work). `sst env` will be removed in SST v3

   ```diff
   - sst env next dev
   + sst bind next dev
   ```
## Upgrade to v2.0

The 2.0 upgrade is primarily ergonomic and should not result in any infrastructure changes.

#### Packages

1. SST is now a monorepo, remove all packages referencing `@serverless-stack/resources` `@serverless-stack/cli` `@serverless-stack/node` and `@serverless-stack/static-site-env`. Install the `sst` package

   ```diff
   {
     "devDependencies": {
   -   "@serverless-stack/resources": "xxx",
   -   "@serverless-stack/cli": "xxx",
   -   "@serverless-stack/static-site-env": "xxx",
   -   "@serverless-stack/node": "xxx",
   +   "sst": "2.x",
   +   "constructs": "10.1.156"
     }
   }
   ```

2. Ensure `"constructs": "10.1.156"` is installed
3. In your stacks code replace all imports from `@serverless-stack/resources` to `sst/constructs`
   ```diff
   - import { Function } from "@serverless-stack/resources"
   + import { Function } from "sst/constructs"
   ```
4. If you were using `@serverless-stack/static-site-env` for your frontend, replace it with the `sst env '<command>'` command
   ```diff
   "scripts": {
   - "dev": "static-site-env -- vite dev",
   + "dev": "sst env vite dev",
   }
   ```

#### App configuration

`sst.json` is now specified as a `sst.config.ts` file. The `main` field has been replaced with a function that can directly import your stacks.

```js
import type { SSTConfig } from "sst"
import { Api } from "./stacks/Api.js"
import { Dynamo } from "./stacks/Dynamo.js"

export default {
  config(input) {
    return {
      name: "myapp",
      region: "us-east-1",
      profile: "my-company-dev"
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs18.x",
      architecture: "arm_64",
    })

    app
      .stack(Api)
      .stack(Dynamo)
  },
} satisfies SSTConfig
```

#### CLI

1. `sst start` has been renamed to `sst dev` (although both will work)
2. `sst load-config` has been removed — [see v1.16](#upgrade-to-v116)
3. `sst dev` requires additional IAM permissions:

   - iot:Connect
   - iot:DescribeEndpoint
   - iot:Publish
   - iot:Receive
   - iot:Subscribe

   [View the complete list of permissions](./advanced/iam-credentials.md#cli-permissions) required by the CLI.

#### Stacks code

1. In stacks code, process.env.IS_LOCAL is no longer available. Please use app.mode to see if it's running in "dev" mode. `app.local` will continue to work but likely will be deprecated at some point.
1. SST no longer requires a DebugStack to be deployed - feel free to delete this from your AWS console.
1. Function
   1. Default runtime is `nodejs16.x`
   1. Default format is `esm` instead of `cjs`. However, you might have some dependencies that have not properly supported `esm` yet. To get around this you can set the [`format`](constructs/Function.md#format) to `cjs` in your default function props. While v2 doesn't need you to upgrade to `esm`, the SST [Node client](clients/index.md) requires `esm` because of their use of top-level await. So it's recommended that you move over in the near future.
      ```ts title="sst.config.ts"
      app.setDefaultFunctionProps({
        nodejs: {
          format: "cjs",
        },
      });
      ```
   1. We've made changes to the `FunctionProps` API so you should be seeing type errors around the `bundle` property. Most of the options there have been moved to a `nodejs` property instead.
      ```diff
      const fn = new Function(stack, "fn", {
      - bundle: {
      -   format: "esm",
      - },
      + nodejs: {
      +   format: "esm"
      + }
      })
      ```
   1. We've removed the need for `srcPath` in function definitions but all your handler paths need to be specified relative to the root of the project.
      ```diff
      new Function(stack, "fn", {
      - srcPath: "services",
      - handler: "path/to/func.handler"
      + handler: "services/path/to/func.handler"
      })
      ```
   1. Removed `config` prop — [see v1.16](#upgrade-to-v116)
1. Api: removed the `pothos` route type — [see v1.18](#upgrade-to-v118)
1. StaticSite, NextjsSite, and RemixSite

   1. Following attributes were renamed:
      - `bucketArn` renamed to `cdk.bucket.bucketArn`
      - `bucketName` renamed to `cdk.bucket.bucketName`
      - `distributionId` renamed to `cdk.distribution.distributionId`
      - `distributionDomain` renamed to `cdk.distribution.distributionDomainName`
      ```diff
      const site = new StaticSite(stack, "MySite");
      - site.bucketArn
      - site.bucketName
      - site.distributionId
      - site.distributionDomain
      + site.cdk.bucket.bucketArn
      + site.cdk.bucket.bucketName
      + site.cdk.distribution.distributionId
      + site.cdk.distribution.distributionDomainName
      ```
   1. Running `sst dev` no longer deploys a placeholder site
      - `site.url` is `undefined` in dev mode
      - `site.customDomainUrl` is `undefined` in dev mode
   1. `waitForInvalidation` now defaults to `false`

1. NextjsSite
   1. in SST v1, the `NextjsSite` construct uses the [`@sls-next/lambda-at-edge package`](https://github.com/serverless-nextjs/serverless-next.js/tree/master/packages/libs/lambda-at-edge) package from the [`serverless-next.js`](https://github.com/serverless-nextjs/serverless-next.js) project to build and package your Next.js app so that it can be deployed to AWS. The project is no longer maintained. SST v2 uses the [`OpenNext`](https://open-next.js.org) project. You can still use the old `NextjsSite` construct like this:
      ```ts
      import { NextjsSite } from "sst/constructs/deprecated";
      ```
   2. `commandHooks.afterBuild` renamed to `buildCommand`
      ```diff
      new NextjsSite(stack, "NextSite", {
        path: "path/to/site",
      - commandHooks: {
      -   afterBuild: ["npx next-sitemap"],
      - }
      + buildCommand: "npx open-next@latest build && npx next-sitemap"
      });
      ```
1. Removed ViteStaticSite and ReactStaticSite — [see v1.18](#upgrade-to-v118)
1. Removed GraphQLApi — [see v1.18](#upgrade-to-v118)

#### Function code

1. In your functions code replace all imports from `@serverless-stack/node/xxx` to `sst/node/xxx`
   ```diff
   - import { Bucket } from "@serverless-stack/node/bucket"
   + import { Bucket } from "sst/node/bucket"
   ```
1. If you're using function binding we moved type generation into a `.sst` folder. To include this place an `sst-env.d.ts` file in any package that needs the types that contains the following:
   ```js
   /// <reference path="../.sst/types/index.ts" />
   ```
   Make sure you specify the path correctly

#### Secrets

1. The SSM parameter path for storing the secret values have changed in v1.16. If you are upgrading from a version prior to v1.16, run this `sst transform` command in each stage with secrets set:
   ```bash
   sst transform resource-binding-secrets
   ```

#### Say bye to debug stack 👋

In v1, SST used to deploy a debug stack in your AWS account when you ran `sst start`. Debug stack contains resources required for [Live Lambda Development](./live-lambda-development.md) to work. In v2, SST no longer need the debug stack. You can remove it by going to your AWS CloudFormation console. Find the stack named `{stageName}-{appName}-debug-stack`, where `{stageName}` is the name of the stage, and `{appName}` is the name of your SST app. And remove the stack.

---

## Upgrade to v1.18

#### Constructs

1. Api: The **`pothos` route type is renamed to `graphql`**, and will be removed in SST v2.

   ```diff
   new Api(stack, "api", {
     routes: {
       "POST /graphql": {
   -     type: "pothos",
   +     type: "graphql",
         function: handler: "functions/graphql/graphql.ts",
   -     schema: "backend/functions/graphql/schema.ts",
   -     output: "graphql/schema.graphql",
   -     commands: [
   -       "./genql graphql/graphql.schema graphql/
   -     ]
   +     pothos: {
   +       schema: "backend/functions/graphql/schema.ts",
   +       output: "graphql/schema.graphql",
   +       commands: [
   +         "./genql graphql/graphql.schema graphql/
   +       ]
   +     }
       }
     }
   });
   ```

2. GraphQLApi: The `GraphQLApi` construct is deprecated, and will be removed in SST v2. **Use the `Api` construct with a `graphql` route instead**.

   ```diff
   - new GraphQLApi(stack, "api", {
   -   server: "src/graphql.handler",
   - });

   + new Api(stack, "api", {
   +   routes: {
   +     "POST /": {
   +       type: "graphql",
   +       function: "src/graphql.handler",
   +     }
   +   }
   + });
   ```

   Note that the `GraphQLApi` construct used to create both `GET` and `POST` routes. In most cases, only `POST` is used. You can also create the `GET` route like this:

   ```diff
   new Api(stack, "api", {
     routes: {
   +   "GET /": {
   +     type: "graphql",
   +     function: "src/graphql.handler",
   +   },
       "POST /": {
         type: "graphql",
         function: "src/graphql.handler",
       }
     }
   });
   ```

3. ViteStaticSite: The `ViteStaticSite` construct is deprecated, and will be removed in SST v2. **Use the `StaticSite` construct instead. Specify `buildCommand`, `buildOutput`, and rename `typesPath` to `vite.types`**.

   ```diff
   - new ViteStaticSite(stack, "frontend", {
   + new StaticSite(stack, "frontend", {
       path: "path/to/src",
   +   buildCommand: "npm run build", // or "yarn build"
   +   buildOutput: "dist",
       customDomain: "mydomain.com",
       environment: {
         VITE_API_URL: api.url,
       },
   -   typesPath: "types/my-env.d.ts",
   +   vite: {
   +     types: "types/my-env.d.ts",
   +   }
     });
   ```

4. ReactStaticSite: The `ReactStaticSite` construct is deprecated, and will be removed in SST v2. **Use the `StaticSite` construct instead. Specify `buildCommand` and `buildOutput`**.

   ```diff
   - new ReactStaticSite(stack, "frontend", {
   + new StaticSite(stack, "frontend", {
       path: "path/to/src",
   +   buildCommand: "npm run build", // or "yarn build"
   +   buildOutput: "build",
       customDomain: "mydomain.com",
       environment: {
         REACT_APP_API_URL: api.url,
       },
     });
   ```

---

## Upgrade to v1.16

[Resource Binding](resource-binding.md) was introduced in this release. It simplifies accessing the resources in your app. For example, here's how we bind the bucket to the function:

```diff
const bucket = new Bucket(stack, "myFiles");

new Function(stack, "myFunction", {
  handler: "lambda.handler",
- environment: {
-   BUCKET_NAME: bucket.bucketName,
- },
- permissions: [bucket],
+ bind: [bucket],
});
```

And here's how we access it in our function.

```diff
+ import { Bucket } from "@serverless-stack/node/bucket";

- process.env.BUCKET_NAME
+ Bucket.myFiles.bucketName
```

Following are the steps to upgrade.

1. **CLI**

   1. The path for the SSM parameters that stores the secrets has changed. So you'll **need to run `sst deploy` or `sst dev`** before using the [`sst secrets`](packages/sst.md#sst-secrets) CLI.

   2. **The `sst load-config` command is being renamed to `sst bind`** and will be removed in SST v2

      ```diff
      - sst load-config -- vitest run
      + sst bind -- vitest run
      ```

2. **Constructs**

   1. **Construct IDs need to be unique** and match the pattern `[a-zA-Z]([a-zA-Z0-9-_])+`. If you have constructs with clashing IDs, change to a unique ID. And pass the old ID into `cdk.id` to ensure CloudFormation does not recreate the resource.

      For example, if you have two buckets with the same id.

      ```diff
      - new Bucket(stack, "bucket");
      - new Bucket(stack, "bucket");

      + new Bucket(stack, "usersFiles", {
      +   cdk: { id: "bucket" },
      + });
      + new Bucket(stack, "adminFiles", {
      +   cdk: { id: "bucket" },
      + });
      ```

   2. Function/Job: **Pass Secrets and Parameters into `bind`** instead of `config`. The `config` option will be removed in SST v2.

      ```diff
      new Function(stack, "myFn", {
      - config: [MY_STRIPE_KEY],
      + bind: [MY_STRIPE_KEY],
      });

      new Job(stack, "myJob", {
      - config: [MY_STRIPE_KEY],
      + bind: [MY_STRIPE_KEY],
      });
      ```

   3. Function/Job: **Pass SST Constructs into `bind`** instead of `permissions` to grant permissions. `permissions` will not accept SST Constructs in SST v2.

      ```diff
      new Function(stack, "myFn", {
      - permissions: [myTopic],
      + bind: [myTopic],
      });

      new Job(stack, "myJob", {
      - permissions: [myTopic],
      + bind: [myTopic],
      });
      ```

   4. App/Stack: **Pass Secrets and Parameters into `addDefaultFunctionBinding`** instead of `addDefaultFunctionConfig`. `addDefaultFunctionConfig` will be removed in SST v2

      ```diff
      - app.addDefaultFunctionConfig([MY_STRIPE_KEY]);
      + app.addDefaultFunctionBinding([MY_STRIPE_KEY]);

      - stack.addDefaultFunctionConfig([MY_STRIPE_KEY]);
      + stack.addDefaultFunctionBinding([MY_STRIPE_KEY]);
      ```

   5. App/Stack: **Pass SST Constructs into `addDefaultFunctionBinding`** instead of `addDefaultFunctionPermissions` to grant permissions. `addDefaultFunctionPermissions` will not accept SST Constructs in SST v2.

      ```diff
      - app.addDefaultFunctionPermissions([myTopic]);
      + app.addDefaultFunctionBinding([myTopic]);

      - stack.addDefaultFunctionPermissions([myTopic]);
      + stack.addDefaultFunctionBinding([myTopic]);
      ```

3. **Client**

   1. **Change `Job.run("myJob")` to `Job.myJob.run()`** in your functions code.

      ```diff
      - Job.run("myJob", { payload });
      + Job.myJob.run({ payload });
      ```

---

## Upgrade to v1.10

#### Constructs

- The old `Auth` construct has been renamed to `Cognito` construct.

  ```diff
  - new Auth(stack, "auth", {
  + new Cognito(stack, "auth", {
      login: ["email"],
    });
  ```

---

## Upgrade to v1.3

#### Constructs

- Auth: `attachPermissionsForAuthUsers()` and `attachPermissionsForUnauthUsers()` now take a scope as the first argument.

  ```diff
  const auth = new Auth(stack, "auth", {
    login: ["email"],
  });

  - auth.attachPermissionsForAuthUsers(["s3", "sns"]);
  + auth.attachPermissionsForAuthUsers(auth, ["s3", "sns"]);

  - auth.attachPermissionsForUnauthUsers(["s3"]);
  + auth.attachPermissionsForUnauthUsers([auth, "s3"]);
  ```

---

## Migrate to v1.0

[View the full migration guide](./constructs/v0/migration.md)
