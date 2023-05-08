# astro-sst

This adapter allows Astro to deploy your SSR site to [AWS](https://aws.amazon.com/).

## Installation

Add the AWS adapter to enable SSR in your Astro project with the following `astro add` command. This will install the adapter and make the appropriate changes to your `astro.config.mjs` file in one step.

```sh
# Using NPM
npx astro add astro-sst
# Using Yarn
yarn astro add astro-sst
# Using PNPM
pnpm astro add astro-sst
```

If you prefer to install the adapter manually instead, complete the following two steps:

1. Install the AWS adapter to your project’s dependencies using your preferred package manager. If you’re using npm or aren’t sure, run this in the terminal:

   ```bash
     npm install astro-sst
   ```

1. Add two new lines to your `astro.config.mjs` project configuration file.

   ```js title="astro.config.mjs" ins={2, 5-6}
   import { defineConfig } from "astro/config";
   import aws from "astro-sst/lambda";

   export default defineConfig({
     output: "server",
     adapter: aws(),
   });
   ```

### Targets

You can deploy to different targets:

- `edge`: SSR inside a [Lambda@Edge function](https://aws.amazon.com/lambda/).
- `lambda`: SSR inside a [Lambda function](https://aws.amazon.com/lambda/edge/).

You can change where to target by changing the import:

```js
import aws from "astro-sst/lambda";
import aws from "astro-sst/edge";
```
