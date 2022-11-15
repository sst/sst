import path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";

import { App } from "./App.js";
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
 * The `ViteStaticSite` construct is a higher level CDK construct that makes it easy to create a Vite single page app.
 *
 * @example
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

    // Show warning
    const app = scope.node.root as App;
    app.reportWarning("usingViteStaticSite");

    // generate buildCommand
    let defaultBuildCommand = "npm run build";
    if (fs.existsSync(path.join(sitePath, "yarn.lock"))) {
      defaultBuildCommand = "yarn build";
    }

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
      vite: {
        types: typesPath,
      },
      ...props,
    });
  }
}