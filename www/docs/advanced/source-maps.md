---
title: Source Maps
description: "Enabling source maps for your frontend and Lambda functions in SST."
---

Enabling source maps for your frontend and Lambda functions in SST is straightforward and enhances error debugging.

---

## Local Development

In [Live Lambda Dev](../live-lambda-development.md), source maps are enabled by default. Generated `.map` files are placed alongside their corresponding source files. Functions are invoked with the `--enable-source-maps` flag, ensuring error stack traces display accurate line numbers.

---

## Deployment

During deployment, SST automatically generates source maps for Node.js Lambda functions, including the frontend server functions. These maps are not included in the function bundle by default to minimize Lambda startup times, given their potentially large size.

We'll explore several methods to enable source maps.

---

### SST Console

Source maps work out of the box in the SST Console. They allow the Console to accurately identify the source of errors in functions or frontend code, showing the relevant source context. Support is available for:

- **Functions**: Enabled by default for Node.js runtimes.
- **AstroSite**: Starting with v2.35.0, source maps are enabled by default. [Learn more](../constructs/AstroSite.md#source-maps)
- **NextjsSite**: Starting with v2.36.0, source maps are supported. [Instructions for enabling them in Next.js apps](../constructs/NextjsSite.md#source-maps) can be found here.
- Other frameworks: Support for other frontend frameworks is coming soon.

With active source maps, errors in your frontend server functions are displayed with accurate context.

![Next.js error stack trace](/img/nextjssite/error-stack-trace.png)

:::info
Sourcemap files are not included in the function bundle to keep the function size small.
:::

---

### CloudWatch Console

Activate source maps in the CloudWatch Console by setting `--enable-source-maps` in the `NODE_OPTIONS` environment variable.

```js {4,6-8}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
  nodejs: {
    sourcemap: true,
  },
});
```

Alternatively, enable source maps for all the functions in your app.

```js title="sst.config.ts" {8,10-12}
export default {
  config() {
    // Config
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
      nodejs: {
        sourcemap: true,
      },
    });

    // Add stacks
  },
} satisfies SSTConfig;
```

---

### Sentry

To use source maps in Sentry or any similar error logging service, you should upload them directly. Avoid including them in your Lambda function packages, as that would affect cold start times.

To do this you copy the source maps to a separate directory. And then upload them to Sentry.

First, add the following script to your project. Let's add it to the root for now.

```ts title="build-utils.ts"
import fs from "fs";
import path from "path";

export function mergeFilesIntoFolder(source: string, destination: string) {
  // Make sure the source directory exists
  if (!fs.existsSync(source)) {
    console.error(`Source directory ${source} does not exist.`);
    return;
  }

  // Make sure the destination directory exists
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Recursively copy files from source to destination
  fs.readdirSync(source).forEach((file) => {
    const filePath = path.join(source, file);
    const destPath = path.join(destination, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      mergeFilesIntoFolder(filePath, destPath);
    } else {
      fs.copyFileSync(filePath, destPath);

      /**
       * Remove .map files from the source directory so they won't be included
       * in the Lambda bundle.
       */
      if (path.extname(file) === ".map") {
        fs.unlinkSync(filePath);
      }
    }
  });
}
```

Then import it into your `sst.config.ts` and call it from the `afterBuild` hook.

```ts title="sst.config.ts"
import { mergeFilesIntoFolder } from "./build-utils";

export default {
  config() {
    // Config
  },
  stacks(app) {
    app.setDefaultFunctionProps(stack => ({
      hooks: {
        async afterBuild(props, out) {
          app.mode === "deploy" && mergeFilesIntoFolder(out, "./.build/sourcemaps");
        },
      },
    });

    // Add stacks
  },
} satisfies SSTConfig;
```

After building your project, the source maps will be moved to `.build/sourcemaps`. You can now upload them to Sentry using the Sentry CLI.

```bash
npx sentry-cli releases --org myorg --project myproj files $SENTRY_RELEASE upload-sourcemaps .build/sourcemaps
```

You can [check out the Sentry docs](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/typescript/) for more details on uploading source maps. Also, [check out our docs on how to use Sentry to monitor your app](./monitoring.md#sentry).
