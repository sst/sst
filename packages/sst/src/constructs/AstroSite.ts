import fs from "fs";
import path from "path";

import type { RouteType } from "astro";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import {
  SsrSite,
  SsrSiteProps,
  ImportedSsrBuildProps,
  SsrBuildConfig,
} from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";

type AstroImportedBuildProps = ImportedSsrBuildProps & {
  astroSite: {
    outputMode: "server" | "static" | "hybrid";
    pageResolution: "file" | "directory";
    trailingSlash: boolean;
    redirects: Record<
      string,
      | string
      | {
          status: 300 | 301 | 302 | 303 | 304 | 307 | 308;
          destination: string;
        }
    >;
    routes: Array<{
      route: string;
      type: RouteType;
      pattern: string;
      prerender: boolean;
    }>;
  };
};

/**
 * The `AstroSite` construct is a higher level CDK construct that makes it easy to create a Astro app.
 * @example
 * Deploys a Astro app in the `my-astro-app` directory.
 *
 * ```js
 * new AstroSite(stack, "web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class AstroSite extends SsrSite {
  protected declare importedBuildProps: AstroImportedBuildProps;

  constructor(scope: Construct, id: string, props: SsrSiteProps) {
    const buildPropsPath = path.join(
      props.path ?? ".",
      "dist",
      "sst.build-props.json"
    );
    let importedBuildProps: AstroImportedBuildProps;

    if (fs.existsSync(buildPropsPath)) {
      importedBuildProps = JSON.parse(fs.readFileSync(buildPropsPath, "utf8"));
    } else {
      throw new Error(
        `Could not find build props file at ${buildPropsPath}. Update your 'astro-sst' package version and rebuild your Astro site.`
      );
    }

    super(scope, id, props, importedBuildProps);
  }

  protected initBuildConfig(): SsrBuildConfig {
    const groupS3PathPrefix = "__statics__";
    const buildConfig: SsrBuildConfig = {
      typesPath: "src",
      serverOperationMode: "ssr-hybrid",
      serverBuildOutputFile: "dist/server/entry.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "_astro",
      ...this.importedBuildProps.buildConfig,
    };

    return {
      ...buildConfig,
      clientBuildS3KeyPrefix: path.posix.join(
        buildConfig.clientBuildS3KeyPrefix ?? "",
        groupS3PathPrefix
      ),
      serverCFFunctionInjection:
        buildConfig.serverCFFunctionInjection ??
        this.createCFRoutingFunction(groupS3PathPrefix),
    };
  }

  protected validateBuildOutput() {
    if (!fs.existsSync(this.buildConfig.serverBuildOutputFile)) {
      throw new Error(
        `Build output inside "dist/" does not contain the server entry file. Make sure Server-side Rendering (SSR) is enabled in your Astro app. If you are looking to deploy the Astro app as a static site, please use the StaticSite construct — https://docs.sst.dev/constructs/StaticSite`
      );
    }
    if (!fs.existsSync(this.buildConfig.clientBuildOutputDir)) {
      throw new Error(
        `Build output inside "dist/" does not contain the client folders. Make sure Server-side Rendering (SSR) is enabled in your Astro app. If you are looking to deploy the Astro app as a static site, please use the StaticSite construct — https://docs.sst.dev/constructs/StaticSite`
      );
    }

    super.validateBuildOutput();
  }

  /**
   * String literal to be injected into the function handler ran by the CloudFront distribution
   * for performing route rewrites and user redirects.
   *
   * Context for code injection:
   * function handler(event) {
   *   var request = event.request;
   *   request.headers["x-forwarded-host"] = request.headers.host;
   *   ${this.buildConfig.serverCFFunctionInjection || ""}
   *   return request;
   * }
   */
  protected createCFRoutingFunction(staticsS3KeyPrefix: string) {
    const serializedRoutes =
      "[\n" +
      this.importedBuildProps.astroSite.routes
        .map((route) => {
          return `    {pattern: ${route.pattern}, type: "${route.type}", prerender: ${route.prerender}}`;
        })
        .join(",\n") +
      "  \n]";

    return `// AstroSite CF Routing Function
  var astroRoutes = ${serializedRoutes};
  var matchedRoute = astroRoutes.find(route => route.pattern.test(request.uri));
  if (matchedRoute) {
    if (matchedRoute.prerender) {
      if (matchedRoute.type === "page") {
        request.uri = "/${staticsS3KeyPrefix}" + request.uri + (request.uri.endsWith("/") ? "" : "/") + "index.html";
      } else {
        request.uri = "/${staticsS3KeyPrefix}" + request.uri;
      }
    }
  } else {
    request.uri = "/${staticsS3KeyPrefix}" + request.uri;
  }
  // End AstroSite CF Routing Function`;
  }

  protected createCloudFrontS3Origin() {
    return new S3Origin(this.bucket, {
      originPath: path.posix.join(
        `/${this.buildConfig.clientBuildS3KeyPrefix ?? ""}`,
        ".."
      ),
    });
  }

  protected createFunctionForRegional() {
    const {
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      nodejs,
      bind,
      cdk,
    } = this.props;

    return new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Astro",
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
      bind,
      environment,
      permissions,
      ...cdk?.server,
    });
  }

  protected createFunctionForEdge() {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      nodejs,
    } = this.props;

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
    });
  }

  public getConstructMetadata() {
    return {
      type: "AstroSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
