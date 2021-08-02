import * as path from "path";
import * as fs from "fs-extra";
import * as cdk from "@aws-cdk/core";

import { App } from "./App";
import {
  StaticSite,
  StaticSiteProps,
  StaticSiteErrorOptions,
  StaticSiteEnvironmentOutputsInfo,
} from "./StaticSite";

/////////////////////
// Interfaces
/////////////////////

export interface ReactStaticSiteProps extends StaticSiteProps {
  readonly environment?: { [key: string]: string };
}

/////////////////////
// Construct
/////////////////////

export class ReactStaticSite extends StaticSite {
  constructor(scope: cdk.Construct, id: string, props: ReactStaticSiteProps) {
    const root = scope.node.root as App;
    const { path: sitePath, environment, replaceValues } = props || {};

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
