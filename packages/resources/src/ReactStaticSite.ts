import * as path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";

import { App } from "./App.js";
import { SSTConstruct } from "./Construct.js";
import { StaticSite, StaticSiteProps } from "./StaticSite.js";

export type ReactStaticSiteProps = StaticSiteProps;

/////////////////////
// Construct
/////////////////////

/**
 * The `ReactStaticSite` construct is a higher level CDK construct that makes it easy to create a React single page app.
 * 
 * @example
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

    // Show warning
    const app = scope.node.root as App;
    app.reportWarning("usingReactStaticSite");

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