---
title: Source Maps
description: "Enabling source maps for Lambda functions in SST."
---

For Lambda functions with Node.js runtimes, SST will automatically generate source maps. The source maps are not used by default as it affects the startup time for Lambda functions. This is because the source maps files can be quite large.

## Enable source maps

You can enable the use of source maps by setting `--enable-source-maps` in the `NODE_OPTIONS` environment variable.

```js {4,6-8}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
  bundle: {
    sourcemap: true,
  },
});
```

Alternatively, you can also enable source maps for all the functions in your app.

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
      bundle: {
        sourcemap: true,
      },
    });

    // Add stacks
  },
} satisfies SSTConfig;
```

## Upload source maps to Sentry

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
