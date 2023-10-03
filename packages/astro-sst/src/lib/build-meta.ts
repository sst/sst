import type {
  AstroConfig,
  RouteData,
  RouteType,
  ValidRedirectStatus,
} from "astro";
import { join, relative } from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, parse } from "url";

const BUILD_META_EXPORT_NAME = "sst.buildMeta.json";

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

export class BuildMeta {
  protected static astroConfig: AstroConfig;
  protected static buildResults: BuildResults;

  public static setAstroConfig(config: AstroConfig) {
    this.astroConfig = config;
  }

  private static getRedirectPath(
    { segments }: RouteData,
    shouldForceTrailingSlash: boolean
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
      (shouldForceTrailingSlash ? "/" : "")
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
    shouldForceTrailingSlash: boolean
  ): SerializableRoute {
    return {
      route: route.route,
      type: route.type,
      pattern: route.pattern.toString(),
      prerender: route.type !== "redirect" ? route.prerender : undefined,
      redirectPath:
        typeof route.redirectRoute !== "undefined"
          ? BuildMeta.getRedirectPath(
              route.redirectRoute,
              shouldForceTrailingSlash
            )
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
        redirectPath: BuildMeta.getRedirectPath(route, false),
      };
    }

    return {
      route: route.route.replace(/\/$/, ""),
      type: "redirect" as const,
      pattern: route.pattern.toString().replace(/\/\$\/$/, "$/"),
      redirectPath: BuildMeta.getRedirectPath(route, true),
    };
  }

  public static async exportBuildMeta(
    buildExportName = BUILD_META_EXPORT_NAME
  ) {
    const rootDir = fileURLToPath(this.astroConfig.root);

    const outputPath = join(
      relative(rootDir, fileURLToPath(this.astroConfig.outDir)),
      buildExportName
    );

    const shouldForceTrailingSlash =
      this.astroConfig.trailingSlash === "always";

    const routes = this.buildResults.routes
      .map((route) => {
        const routeSet = [
          this.getSerializableRoute(route, shouldForceTrailingSlash),
        ];

        if (
          route.type === "page" &&
          route.route !== "/" &&
          (this.astroConfig.trailingSlash === "always" ||
            this.astroConfig.trailingSlash === "never")
        ) {
          routeSet.push(
            this.getTrailingSlashRedirect(route, this.astroConfig.trailingSlash)
          );
        }

        return routeSet;
      })
      .flat();

    const buildMeta = {
      domainName: this.domainName ?? undefined,
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
    };

    await writeFile(outputPath, JSON.stringify(buildMeta));
  }
}
