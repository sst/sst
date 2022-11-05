/**
 * This file is copied from https://github.com/aws/aws-cdk/blob/master/packages/@aws-cdk/aws-lambda-python/lib/bundling.ts
 */
import fs from "fs";
import url from "url";
import path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Dependency files to exclude from the asset hash.
 */
export const DEPENDENCY_EXCLUDES = ["*.pyc"];

/**
 * The location in the image that the bundler image caches dependencies.
 */
export const BUNDLER_DEPENDENCIES_CACHE = "/var/dependencies";

/**
 * Options for bundling
 */
export interface BundlingOptions {
  /**
   * Entry path
   */
  readonly entry: string;

  /**
   * The runtime of the lambda function
   */
  readonly runtime: lambda.Runtime;

  /**
   * Output path suffix ('python' for a layer, '.' otherwise)
   */
  readonly outputPathSuffix: string;

  /**
   * Determines how asset hash is calculated. Assets will get rebuild and
   * uploaded only if their hash has changed.
   *
   * If asset hash is set to `SOURCE` (default), then only changes to the source
   * directory will cause the asset to rebuild. This means, for example, that in
   * order to pick up a new dependency version, a change must be made to the
   * source tree. Ideally, this can be implemented by including a dependency
   * lockfile in your source tree or using fixed dependencies.
   *
   * If the asset hash is set to `OUTPUT`, the hash is calculated after
   * bundling. This means that any change in the output will cause the asset to
   * be invalidated and uploaded. Bear in mind that `pip` adds timestamps to
   * dependencies it installs, which implies that in this mode Python bundles
   * will _always_ get rebuild and uploaded. Normally this is an anti-pattern
   * since build
   *
   * @default AssetHashType.SOURCE By default, hash is calculated based on the
   * contents of the source directory. If `assetHash` is also specified, the
   * default is `CUSTOM`. This means that only updates to the source will cause
   * the asset to rebuild.
   */
  readonly assetHashType?: cdk.AssetHashType;

  /**
   * Specify a custom hash for this asset. If `assetHashType` is set it must
   * be set to `AssetHashType.CUSTOM`. For consistency, this custom hash will
   * be SHA256 hashed and encoded as hex. The resulting hash will be the asset
   * hash.
   *
   * NOTE: the hash is used in order to identify a specific revision of the asset, and
   * used for optimizing and caching deployment activities related to this asset such as
   * packaging, uploading to Amazon S3, etc. If you chose to customize the hash, you will
   * need to make sure it is updated every time the asset changes, or otherwise it is
   * possible that some deployments will not be invalidated.
   *
   * @default - based on `assetHashType`
   */
  readonly assetHash?: string;

  readonly installCommands?: string[];
}

/**
 * Produce bundled Lambda asset code
 */
export function bundle(options: BundlingOptions): lambda.AssetCode {
  const { entry, runtime, outputPathSuffix, installCommands } = options;

  const stagedir = cdk.FileSystem.mkdtemp("python-bundling-");
  const hasDeps = stageDependencies(entry, stagedir);
  const hasInstallCommands = stageInstallCommands(
    installCommands || [],
    stagedir
  );

  const depsCommand = chain([
    hasDeps || hasInstallCommands
      ? `rsync -r ${BUNDLER_DEPENDENCIES_CACHE}/. ${cdk.AssetStaging.BUNDLING_OUTPUT_DIR}/${outputPathSuffix}`
      : "",
    `rsync -r . ${cdk.AssetStaging.BUNDLING_OUTPUT_DIR}/${outputPathSuffix}`,
  ]);

  // Determine which dockerfile to use. When dependencies are present, we use a
  // Dockerfile that can create a cacheable layer. We can't use this Dockerfile
  // if there aren't dependencies or the Dockerfile will complain about missing
  // sources.
  const dockerfile = hasInstallCommands
    ? "Dockerfile.custom"
    : hasDeps
    ? "Dockerfile.dependencies"
    : "Dockerfile";

  // copy Dockerfile to workdir
  fs.copyFileSync(
    path.join(__dirname, "../../../assets/python", dockerfile),
    path.join(stagedir, dockerfile)
  );

  const image = cdk.DockerImage.fromBuild(stagedir, {
    buildArgs: {
      IMAGE: runtime.bundlingImage.image,
    },
    file: dockerfile,
  });

  return lambda.Code.fromAsset(entry, {
    assetHashType: options.assetHashType,
    assetHash: options.assetHash,
    exclude: DEPENDENCY_EXCLUDES,
    bundling: {
      image,
      command: ["bash", "-c", depsCommand],
    },
  });
}

/**
 * Checks to see if the `entry` directory contains a type of dependency that
 * we know how to install.
 */
export function stageDependencies(entry: string, stagedir: string): boolean {
  const prefixes = ["Pipfile", "pyproject", "poetry", "requirements.txt"];

  let found = false;
  for (const file of fs.readdirSync(entry)) {
    for (const prefix of prefixes) {
      if (file.startsWith(prefix)) {
        fs.copyFileSync(path.join(entry, file), path.join(stagedir, file));
        found = true;
      }
    }
  }

  return found;
}

function stageInstallCommands(
  installCommands: string[],
  stagedir: string
): boolean {
  let found = false;
  if (installCommands.length > 0) {
    const filePath = path.join(stagedir, "sst-deps-install-command.sh");
    fs.writeFileSync(filePath, installCommands.join(" && "));
    fs.chmodSync(filePath, "755");
    found = true;
  }

  return found;
}

function chain(commands: string[]): string {
  return commands.filter((c) => !!c).join(" && ");
}
