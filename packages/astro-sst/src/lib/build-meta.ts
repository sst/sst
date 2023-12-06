import type {
  AstroConfig,
  RouteData,
  RouteType,
  ValidRedirectStatus,
} from "astro";
import { join, relative } from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, parse } from "url";
import type {
  DeploymentStrategy,
  OutputMode,
  PageResolution,
  ResponseMode,
  TrailingSlash,
} from "./types";

export type BuildMetaFileName = "sst.buildMeta.json";
export const BUILD_META_FILE_NAME: BuildMetaFileName = "sst.buildMeta.json";

type BuildResults = {
  pages: {
    pathname: string;
  }[];
  dir: URL;
  routes: RouteData[];
};

type SerializableRoute = {
  route: string;
  type: RouteType;
  pattern: string;
  prerender?: boolean;
  redirectPath?: string;
  redirectStatus?: ValidRedirectStatus;
};

export type BuildMetaConfig = {
  domainName?: string;
  deploymentStrategy: DeploymentStrategy;
  responseMode: ResponseMode;
  outputMode: OutputMode;
  pageResolution: PageResolution;
  trailingSlash: TrailingSlash;
  serverBuildOutputFile: string;
  clientBuildOutputDir: string;
  clientBuildVersionedSubDir: string;
  serverRoutes: string[];
  routes: Array<{
    route: string;
    type: RouteType;
    pattern: string;
    prerender?: boolean;
    redirectPath?: string;
    redirectStatus?: 300 | 301 | 302 | 303 | 304 | 307 | 308;
  }>;
};

export type IntegrationConfig = {
  deploymentStrategy: DeploymentStrategy;
  responseMode: ResponseMode;
  serverRoutes: string[];
};

export class BuildMeta {
  protected static integrationConfig: IntegrationConfig;
  protected static astroConfig: AstroConfig;
  protected static buildResults: BuildResults;

  public static setIntegrationConfig(config: IntegrationConfig) {
    this.integrationConfig = config;
  }

  public static setAstroConfig(config: AstroConfig) {
    this.astroConfig = config;
  }

  private static getRedirectPath(
    { segments }: RouteData,
    trailingSlash: TrailingSlash
  ) {
    let i = 0;
    return (
      "/" +
      segments
        .map((segment) =>
          segment
            .map((part) => (part.dynamic ? `\${${++i}}` : part.content))
            .join("")
        )
        .join("/") +
      (trailingSlash === "always" ? "/" : "")
    ).replace(/\/+/g, "/");
  }

  public static setBuildResults(buildResults: BuildResults) {
    this.buildResults = buildResults;
  }

  private static get domainName() {
    if (
      typeof this.astroConfig.site === "string" &&
      this.astroConfig.site.length > 0
    ) {
      return parse(this.astroConfig.site).hostname ?? undefined;
    }
  }

  private static getSerializableRoute(
    route: RouteData,
    trailingSlash: TrailingSlash,
    outputMode: OutputMode
  ): SerializableRoute {
    const isStatic = outputMode === "static";
    return {
      route: route.route + (trailingSlash === "always" ? "/" : ""),
      type: route.type,
      pattern: route.pattern.toString(),
      prerender:
        route.type !== "redirect" ? isStatic || route.prerender : undefined,
      redirectPath:
        typeof route.redirectRoute !== "undefined"
          ? BuildMeta.getRedirectPath(route.redirectRoute, trailingSlash)
          : typeof route.redirect === "string"
          ? route.redirect
          : route.redirect?.destination,
      redirectStatus:
        typeof route.redirect === "object" ? route.redirect.status : undefined,
    };
  }

  private static getTrailingSlashRedirect(
    route: RouteData,
    trailingSlash: "always" | "never"
  ) {
    if (trailingSlash === "never") {
      return {
        route: route.route + "/",
        type: "redirect" as const,
        pattern: route.pattern.toString().replace(/\$\/$/, "\\/$/"),
        redirectPath: BuildMeta.getRedirectPath(route, trailingSlash),
      };
    }

    return {
      route: route.route.replace(/\/$/, ""),
      type: "redirect" as const,
      pattern: route.pattern.toString().replace(/\\\/\$\/$/, "$/"),
      redirectPath: BuildMeta.getRedirectPath(route, trailingSlash),
    };
  }

  public static async exportBuildMeta(buildExportName = BUILD_META_FILE_NAME) {
    const rootDir = fileURLToPath(this.astroConfig.root);

    const outputPath = join(
      relative(rootDir, fileURLToPath(this.astroConfig.outDir)),
      buildExportName
    );

    const routes = this.buildResults.routes
      .map((route) => {
        const routeSet = [
          this.getSerializableRoute(
            route,
            this.astroConfig.trailingSlash,
            this.astroConfig.output
          ),
        ];

        if (route.type === "page" && route.route !== "/") {
          if (this.astroConfig.trailingSlash === "never") {
            routeSet.unshift(
              this.getTrailingSlashRedirect(
                route,
                this.astroConfig.trailingSlash
              )
            );
          } else if (this.astroConfig.trailingSlash === "always") {
            routeSet.push(
              this.getTrailingSlashRedirect(
                route,
                this.astroConfig.trailingSlash
              )
            );
          }
        }

        return routeSet;
      })
      .flat();

    if (this.astroConfig.output === "static") {
      const lastAssetIndex = routes.reduce(
        (acc, { route }, index) =>
          route.startsWith(`/${this.astroConfig.build.assets}`) ? index : acc,
        -1
      );

      routes.splice(lastAssetIndex + 1, 0, {
        route: `/${this.astroConfig.build.assets}/[...slug]`,
        type: "endpoint",
        pattern: `/^\\/${this.astroConfig.build.assets}\\/.*?\\/?$/`,
        prerender: true,
      });
    }

    const buildMeta = {
      domainName: this.domainName ?? undefined,
      deploymentStrategy: this.integrationConfig.deploymentStrategy,
      responseMode: this.integrationConfig.responseMode,
      outputMode: this.astroConfig.output,
      pageResolution: this.astroConfig.build.format,
      trailingSlash: this.astroConfig.trailingSlash,
      serverBuildOutputFile: join(
        relative(rootDir, fileURLToPath(this.astroConfig.build.server)),
        this.astroConfig.build.serverEntry
      ),
      clientBuildOutputDir: relative(
        rootDir,
        fileURLToPath(this.astroConfig.build.client)
      ),
      clientBuildVersionedSubDir: this.astroConfig.build.assets,
      routes,
      serverRoutes: this.integrationConfig.serverRoutes,
    } satisfies BuildMetaConfig;

    /**
     * For some reason the Astro integration system sets the following values
     * as if the site was configured for server deployment even when it's
     * actually configured for static. For this reason, we need to override these
     * values as best we can.
     **/
    if (this.astroConfig.output === "static") {
      buildMeta.clientBuildOutputDir = join(
        buildMeta.clientBuildOutputDir,
        "../"
      );
    }

    await writeFile(outputPath, JSON.stringify(buildMeta));
  }
}
