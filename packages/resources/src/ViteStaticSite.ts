import path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";

import { StaticSite, StaticSiteProps } from "./StaticSite.js";

/////////////////////
// Interfaces
/////////////////////

export interface ViteStaticSiteProps extends StaticSiteProps {
  /**
   * The path where code-gen should place the type definition for environment variables
   *
   * @default "src/sst-env.d.ts"
   * @example
   * ```js
   * new ViteStaticSite(stack, "Site", {
   *   typesFile: "./other/path/sst-env.d.ts",
   * })
   * ```
   */
  typesPath?: string;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `ViteStaticSite` construct is a higher level CDK construct that makes it easy to create a Vite single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.
 *
 * It's designed to work with static sites built with [Vite](https://vitejs.dev/). It allows you to [automatically set environment variables](#configuring-environment-variables) in your Vite app directly from the outputs of your SST app. And it can also create a `.d.ts` type definition file for the environment variables.
 *
 * The `ViteStaticSite` construct internally extends the [`StaticSite`](StaticSite.md) construct with the following pre-configured defaults.
 *
 * - [`indexPage`](StaticSite.md#indexpage) is set to `index.html`.
 * - [`errorPage`](StaticSite.md#errorpage) is set to `redirect_to_index_page`. So error pages are redirected to the index page.
 * - [`buildCommand`](StaticSite.md#buildcommand) is `npm run build`.
 * - [`buildOutput`](StaticSite.md#buildoutput) is the `dist` folder in your Vite app.
 * - [`fileOptions`](StaticSite.md#fileoptions) sets the cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files.
 *
 * @example
 *
 * ### Minimal Config
 *
 * Deploys a Vite app in the `path/to/src` directory.
 *
 * ```js
 * new ViteStaticSite(stack, "Site", {
 *   path: "path/to/src",
 * });
 * ```
 */
export class ViteStaticSite extends StaticSite {
  constructor(scope: Construct, id: string, props: ViteStaticSiteProps) {
    const { path: sitePath, environment, typesPath } = props || {};

    // generate buildCommand
    let defaultBuildCommand = "npm run build";
    if (fs.existsSync(path.join(sitePath, "yarn.lock"))) {
      defaultBuildCommand = "yarn build";
    }

    // create types file
    const filePath = path.resolve(
      path.join(sitePath, typesPath || "src/sst-env.d.ts")
    );
    generateTypesFile(filePath, environment);

    super(scope, id, {
      indexPage: "index.html",
      errorPage: "redirect_to_index_page",
      buildCommand: defaultBuildCommand,
      buildOutput: "dist",
      fileOptions: [
        {
          exclude: "*",
          include: "*.html",
          cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
        },
        {
          exclude: "*",
          include: ["*.js", "*.css"],
          cacheControl: "max-age=31536000,public,immutable",
        },
      ],
      ...props,
    });
  }
}

function generateTypesFile(
  typesFullPath: string,
  environment?: { [key: string]: string }
) {
  const content = `/// <reference types="vite/client" />

interface ImportMetaEnv {
${Object.keys(environment || {})
  .map((key) => `  readonly ${key}: string`)
  .join("\n")}
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}`;

  fs.ensureDirSync(path.dirname(typesFullPath));
  fs.writeFileSync(typesFullPath, content);
}
