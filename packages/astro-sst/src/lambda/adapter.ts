import type {
  AstroAdapter,
  AstroIntegration,
  AstroConfig,
  RouteData,
} from "astro";
import { join, relative } from "path";
import { writeFile } from "fs/promises";
import { fileURLToPath, parse } from "url";

const PACKAGE_NAME = "astro-sst/lambda";
const BUILD_EXPORT_NAME = "sst.build-props.json";

function getAdapter(): AstroAdapter {
  return {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    exports: ["handler"],
  };
}

export default function createIntegration(): AstroIntegration {
  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        BuildProps.setAstroConfig(config);
        setAdapter(getAdapter());
      },
      "astro:build:done": async (config) => {
        BuildProps.setBuildResults(config);
        await BuildProps.exportBuildProps();
      },
    },
  };
}

type BuildResults = {
  pages: {
    pathname: string;
  }[];
  dir: URL;
  routes: RouteData[];
};

class BuildProps {
  protected static astroConfig: AstroConfig;
  protected static buildResults: BuildResults;

  public static setAstroConfig(config: AstroConfig) {
    this.astroConfig = config;
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

  public static async exportBuildProps() {
    const rootDir = fileURLToPath(this.astroConfig.root);

    const outputPath = join(
      relative(rootDir, fileURLToPath(this.astroConfig.outDir)),
      BUILD_EXPORT_NAME
    );

    const buildProps = {
      props: {
        customDomain: this.domainName ? { domainName: this.domainName } : undefined,
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
    };

    await writeFile(outputPath, JSON.stringify(buildProps));
  }
}
