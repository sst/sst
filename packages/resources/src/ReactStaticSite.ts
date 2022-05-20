import * as path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";

import { StaticSite, StaticSiteProps } from "./StaticSite.js";
import { SSTConstruct } from "./Construct.js";

/////////////////////
// Construct
/////////////////////

/**
 * The `ReactStaticSite` construct is a higher level CDK construct that makes it easy to create a React single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.
 *
 * It's designed to work with static sites built with [Create React App](https://create-react-app.dev/). It allows you to [automatically set environment variables](#configuring-environment-variables) in your React app directly from the outputs of your SST app. And it can also create a `.d.ts` type definition file for the environment variables.
 *
 * The `ReactStaticSite` construct internally extends the [`StaticSite`](StaticSite.md) construct with the following pre-configured defaults.
 *
 * - [`indexPage`](StaticSite.md#indexpage) is set to `index.html`.
 * - [`errorPage`](StaticSite.md#errorpage) is set to `redirect_to_index_page`. So error pages are redirected to the index page.
 * - [`buildCommand`](StaticSite.md#buildcommand) is `npm run build`.
 * - [`buildOutput`](StaticSite.md#buildoutput) is the `build` folder in your React app.
 * - [`fileOptions`](StaticSite.md#fileoptions) sets the cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files.
 *
 * @example
 *
 * ### Minimal Config
 *
 * Deploys a Create React App in the `path/to/src` directory.
 *
 * ```js
 * new ReactStaticSite(stack, "ReactSite", {
 *   path: "path/to/src",
 * });
 * ```
 */
export class ReactStaticSite extends StaticSite implements SSTConstruct {
  constructor(scope: Construct, id: string, props: ReactStaticSiteProps) {
    const { path: sitePath, environment } = props || {};

    // Validate environment
    Object.keys(environment || {}).forEach((key) => {
      if (!key.startsWith("REACT_APP_")) {
        throw new Error(
          `Environment variables in the "${id}" ReactStaticSite must start with "REACT_APP_".`
        );
      }
    });

    // generate buildCommand
    let defaultBuildCommand = "npm run build";
    if (fs.existsSync(path.join(sitePath, "yarn.lock"))) {
      defaultBuildCommand = "yarn build";
    }

    super(scope, id, {
      indexPage: "index.html",
      errorPage: "redirect_to_index_page",
      buildCommand: defaultBuildCommand,
      buildOutput: "build",
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

export type ReactStaticSiteProps = StaticSiteProps;
