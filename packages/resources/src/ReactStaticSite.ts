import * as path from "path";
import * as fs from "fs-extra";
import { Construct } from 'constructs';

import {
  StaticSite,
  StaticSiteProps,
  StaticSiteErrorOptions,
} from "./StaticSite";

/////////////////////
// Interfaces
/////////////////////

/**
 * @deprecated This type has been replaced by the standard StaticSiteProps
 */
export type ReactStaticSiteProps = StaticSiteProps;

/////////////////////
// Construct
/////////////////////

export class ReactStaticSite extends StaticSite {
  constructor(scope: Construct, id: string, props: StaticSiteProps) {
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
      errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
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
