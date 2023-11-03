# astro-sst

This adapter allows Astro to deploy your SSR or static site to [AWS](https://aws.amazon.com/).

## Installation

Add the AWS adapter to enable SST in your Astro project with the following `astro add` command. This will install the adapter and make the appropriate changes to your `astro.config.mjs` file in one step.

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
   import aws from "astro-sst";

   export default defineConfig({
     output: "server",
     adapter: aws(),
   });
   ```

### Deployment Strategies

You can utilize different deployment depending on your needs:

- `regional`: SSR inside a [Lambda function](https://aws.amazon.com/lambda/) with [CloudFront](https://aws.amazon.com/cloudfront/) cached assets. (_default_)
- `edge`: SSR inside a [Lambda@Edge function](https://aws.amazon.com/lambda/edge/) with [CloudFront](https://aws.amazon.com/cloudfront/) cached assets.
- `static`: SSG assets deployed to [S3](https://aws.amazon.com/s3/) with [CloudFront](https://aws.amazon.com/cloudfront/) cached assets.

You can change where to target by changing the import:

```js title="astro.config.mjs" ins={2, 5-6}
import { defineConfig } from "astro/config";
import aws from "astro-sst";

export default defineConfig({
  output: "server",
  adapter: aws({
    deploymentStrategy: "edge",
  }),
});
```

### Response Mode

When utilizing `regional` deployment strategy, you can choose how responses are handled:

- `buffer`: Responses are buffered and sent as a single response. (_default_)
- `stream`: Responses are streamed as they are generated.

```js title="astro.config.mjs" ins={2, 5-6}
import { defineConfig } from "astro/config";
import aws from "astro-sst";

export default defineConfig({
  output: "server",
  adapter: aws({
    deploymentStrategy: "regional",
    responseMode: "stream",
  }),
});
```

### Server Routes

When utilizing `regional` deployment strategy, server routes should be defined for any routes utilizing non-`GET` methods:

```js title="astro.config.mjs" ins={2, 5-6}
import { defineConfig } from "astro/config";
import aws from "astro-sst";

export default defineConfig({
  output: "server",
  adapter: aws({
    deploymentStrategy: "regional",
    serverRoutes: [
      "feedback", // Feedback page which requires POST method
      "login",    // Login page which requires POST method
      "user/*",   // Directory of user routes which are all SSR
      "api/*",    // Directory of API endpoints which require all methods
    ],
  }),
});
```
