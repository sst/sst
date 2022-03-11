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

export interface ViteStaticSiteProps extends StaticSiteProps {
  readonly typesPath?: string;
}

/////////////////////
// Construct
/////////////////////

export class ViteStaticSite extends StaticSite {
  constructor(scope: Construct, id: string, props: ViteStaticSiteProps) {
    const { path: sitePath, environment, typesPath } = props || {};

    // generate buildCommand
    let defaultBuildCommand = "npm run build";
    if (fs.existsSync(path.join(sitePath, "yarn.lock"))) {
      defaultBuildCommand = "yarn build";
    }

    // create types file
    const filePath = path.resolve(path.join(sitePath, typesPath || "src/sst-env.d.ts"));
    generateTypesFile(filePath, environment);

    super(scope, id, {
      indexPage: "index.html",
      errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
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

function generateTypesFile(typesFullPath: string, environment?: { [key: string]: string }) {
  const content =
`/// <reference types="vite/client" />

interface ImportMetaEnv {
${Object.keys(environment || {}).map(key => `  readonly ${key}: string`).join("\n")}
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}`;

  fs.ensureDirSync(path.dirname(typesFullPath));
  fs.writeFileSync(typesFullPath, content);
}
