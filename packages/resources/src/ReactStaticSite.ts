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

    // generate buildCommand
    let defaultBuildCommand = "npm run build";
    if (fs.existsSync(path.join(sitePath, "yarn.lock"))) {
      defaultBuildCommand = "yarn build";
    }

    // generate _buildCommandEnvironment
    // ie. environment => { REACT_APP_API_URL: api.url }
    //     _buildCommandEnvironment => REACT_APP_API_URL="{{ REACT_APP_API_URL }}"
    const defaultBuildCommandEnvironment = {} as { [key: string]: string };
    Object.keys(environment || {}).forEach((e) => {
      defaultBuildCommandEnvironment[e] = `{{ ${e} }}`;
    });

    // generate replaceValues
    const defaultReplaceValues = replaceValues || [];
    Object.entries(environment || {}).forEach(([key, value]) => {
      defaultReplaceValues.push(
        {
          files: "**/*.js",
          search: `{{ ${key} }}`,
          replace: value,
        },
        {
          files: "index.html",
          search: `{{ ${key} }}`,
          replace: value,
        }
      );
    });

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
      // do not override these values
      _buildCommandEnvironment: defaultBuildCommandEnvironment,
      replaceValues: defaultReplaceValues,
    });

    // register environment
    const environmentOutputs = {} as { [key: string]: string };
    Object.entries(environment || {}).forEach(([key, value]) => {
      const outputId = `SST_STATIC_SITE_ENV_${key}`;
      const output = new cdk.CfnOutput(this, outputId, { value });
      environmentOutputs[key] = cdk.Stack.of(this).getLogicalId(output);
    });
    root.registerStaticSiteEnvironment({
      path: sitePath,
      stack: cdk.Stack.of(this).node.id,
      environmentOutputs,
    } as StaticSiteEnvironmentOutputsInfo);
  }
}
