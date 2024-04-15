/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS monorepo
 *
 * A full-stack TypeScript monorepo template that deploys a frontend, a database, and an API
 * to AWS.
 *
 * While, [drop-in mode](/docs/#drop-in-mode) is great for simple projects, we recommend using
 * this template for projects that are going to have multiple packages. 
 *
 * #### Project structure
 *
 * The app is split into the separate `packages/` and an `infra/` directory.
 * 
 * ```txt {2}
 * my-sst-app
 * ├─ sst.config.ts
 * ├─ package.json
 * ├─ packages
 * │  ├─ functions
 * │  ├─ frontend
 * │  ├─ scripts
 * │  └─ core
 * └─ infra
 * ```
 *
 * The `packages/` directory includes the following:
 *
 * - `core/`
 *
 *   This directory includes shared code that can be used by other packages. These are
 *   defined as modules. For example, we have an `Example` module.
 *
 *   ```ts title="packages/core/src/example/index.ts"
 *   export module Example {
 *     export function hello() {
 *       return "Hello, world!";
 *     }
 *   }
 *   ```
 *
 *   We exports this using the following in the `package.json`:
 *
 *   ```json title="packages/core/package.json"
 *   "exports": {
 *     "./*": [
 *       "./src/*\/index.ts",
 *       "./src/*.ts"
 *     ]
 *   }
 *   ```
 *
 *   This will allow us to import the `Example` module by doing:
 *
 *   ```ts
 *   import { Example } from "@aws-monorepo/core/example";
 *
 *   Example.hello();
 *   ```
 *
 * - `functions/`
 *
 *   This directory includes our Lambda funcitons. It imports from the `core/`
 *   package by using it as a local dependency.
 *
 * - `frontend/`
 *
 *   This directory includes a simple Vite app. It references environment variables
 *   from our app and is started locally using.
 *
 *   ```json title="packages/frontend/package.json"
 *   "scripts": {
 *     "dev": "sst dev vite dev"
 *   }
 *   ```
 *
 * - `scripts/`
 *
 *   This directory includes scripts that you can run on your SST app using the `sst shell` CLI
 *   and [`tsx`](https://www.npmjs.com/package/tsx). For example, to the run the example
 *   `scripts/src/example.ts`, run the following from `packages/scripts/`.
 *
 *   ```bash
 *   npm run shell src/example.ts
 *   ```
 *   
 *  #### Infrastructure
 *
 *  The `infra/` directory allows you to logically split the infrastructure of your app into
 *  separate files. This can be helpful as your app grows.
 *
 *  In the template, we have an `api.ts`, `database.ts`, and `frontend.ts`. These export
 *  resources that can be used in the other infrastructure files.
 *
 *  They are also re-exported in the `infra/index.ts` file.
 *
 *  ```ts title="infra/index.ts"
 *  export * from "./api";
 *  export * from "./database";
 *  export * from "./frontend";
 *  ```
 *
 *  And to use them in your `sst.config.ts` we do an dynamic import. This ensures that the
 *  infrastructure is only created in the `run` function.
 *
 */
export default $config({
  app(input) {
    return {
      name: "aws-monorepo",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const infra = await import("./infra");

    return {
      api: infra.api.url,
    };
  },
});
