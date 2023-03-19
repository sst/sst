---
title: Source Maps
description: "Enabling source maps for Lambda functions in SST."
---

For Lambda functions with Node.js runtimes, SST will automatically generate source maps. The source maps are not used by default as it affects the startup time for Lambda functions.

You can enable the use of source maps by setting `--enable-source-maps` in the `NODE_OPTIONS` environment variable.

```js {4}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
  bundle: {
    sourcemap: true
  },
});
```

Alternatively, you can also enable source maps for all the functions in your app.

```js title="stacks/index.js" {4}
export default function main(app) {
  app.setDefaultFunctionProps({
    environment: {
      NODE_OPTIONS: "--enable-source-maps",
    },
    bundle: {
      sourcemap: true
    },
  });

  // Add stacks
}
```

## Uploading source maps to Sentry

If you'd like to generate source maps to upload to Sentry, or any similar error-logging service, but don't want to include potentially large `.map` files in your Lambda ZIP files, you can take advantage of SST hooks to copy source maps into the folder of your choice, while also preventing any `.map` files from being included in the ZIP files that get deployed to AWS Lambda.

First, add the following function to your project at the root level:
```ts
import fs from 'fs';
import path from 'path';

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
  fs.readdirSync(source).forEach(file => {
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
      if (path.extname(file) === '.map') {
        fs.unlinkSync(filePath);
      }
    }
  });
}
```

Then import this into your `sst.config.ts` file and call it from within the `afterBuild` hook:
```ts
import { mergeFilesIntoFolder } from './build-utils';

export default {
  config() {
    return {
      name: 'my-stack',
      region: 'us-east-1',
      bootstrap: {
        stackName: 'SSTBootstrapV2',
      },
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps(stack => ({
      hooks: {
        async afterBuild(props, out) {
          mergeFilesIntoFolder(out, './.build/sourcemaps');
        },
      },
    });
    // etc...
```

After building your project, all relevant files will be in `.build/sourcemaps` and you can upload them to Sentry by using the Sentry CLI:
```bash
$ pnpm sentry-cli releases --org myorg --project myproj files $SENTRY_RELEASE upload-sourcemaps .build/sourcemaps
```

[See the Sentry docs](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/typescript/) for more details on uploading source maps.
