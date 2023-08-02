import type {
  AstroConfig,
  RouteData,
  RouteType,
  ValidRedirectStatus,
} from "astro";
import { join, relative } from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, parse } from "url";

const BUILD_EXPORT_NAME = "sst.build-props.json";

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
  prerender: boolean;
  redirectPath?: string;
  redirectStatus?: ValidRedirectStatus;
};

export class BuildProps {
  protected static astroConfig: AstroConfig;
  protected static buildResults: BuildResults;

  public static setAstroConfig(config: AstroConfig) {
    this.astroConfig = config;
  }

  public static setBuildResults(buildResults: BuildResults) {
    this.buildResults = buildResults;
  }

  private static serializableRoute(route: RouteData): SerializableRoute {
    return {
      route: route.route,
      type: route.type,
      pattern: route.pattern.toString(),
      prerender: route.prerender,
      redirectPath:
        typeof route.redirect === "string"
          ? route.redirect
          : route.redirect?.destination,
      redirectStatus:
        typeof route.redirect === "object" ? route.redirect.status : undefined,
    };
  }

  private static get domainName() {
    if (
      typeof this.astroConfig.site === "string" &&
      this.astroConfig.site.length > 0
    ) {
      return parse(this.astroConfig.site).hostname ?? undefined;
    }
  }

  public static async exportBuildProps(buildExportName = BUILD_EXPORT_NAME) {
    const rootDir = fileURLToPath(this.astroConfig.root);

    const outputPath = join(
      relative(rootDir, fileURLToPath(this.astroConfig.outDir)),
      buildExportName
    );

    const buildProps = {
      props: {
        customDomain: this.domainName,
      },
      buildConfig: {
        typesPath: relative(rootDir, fileURLToPath(this.astroConfig.srcDir)),
        serverBuildOutputFile: join(
          relative(rootDir, fileURLToPath(this.astroConfig.build.server)),
          this.astroConfig.build.serverEntry
        ),
        clientBuildOutputDir: relative(
          rootDir,
          fileURLToPath(this.astroConfig.build.client)
        ),
        clientBuildVersionedSubDir: this.astroConfig.build.assets,
      },
      astroSite: {
        outputMode: this.astroConfig.output,
        pageResolution: this.astroConfig.build.format,
        trailingSlash: this.astroConfig.trailingSlash,
        routes: this.buildResults.routes.map((route) =>
          this.serializableRoute(route)
        ),
      },
    };

    await writeFile(outputPath, JSON.stringify(buildProps));
  }
}
