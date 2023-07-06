import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  cdkCredentialsConfig,
  obtainEcrCredentials,
} from "cdk-assets/lib/private/docker-credentials.js";
import {
  Logger,
  shell,
  ShellOptions,
  ProcessFailedError,
} from "cdk-assets/lib/private/shell.js";
import { createCriticalSection } from "cdk-assets/lib/private/util.js";

interface BuildOptions {
  readonly directory: string;

  /**
   * Tag the image with a given repoName:tag combination
   */
  readonly tag: string;
  readonly target?: string;
  readonly file?: string;
  readonly buildArgs?: Record<string, string>;
  readonly buildSecrets?: Record<string, string>;
  readonly networkMode?: string;
  readonly platform?: string;
  readonly outputs?: string[];
  readonly cacheFrom?: DockerCacheOption[];
  readonly cacheTo?: DockerCacheOption;
  // TODO: remove after PR is merged
  readonly quiet?: boolean;
}

// TODO: remove after PR is merged
interface PushOptions {
  readonly tag: string;
  readonly quiet?: boolean;
}

export interface DockerCredentialsConfig {
  readonly version: string;
  readonly domainCredentials: Record<string, DockerDomainCredentials>;
}

export interface DockerDomainCredentials {
  readonly secretsManagerSecretId?: string;
  readonly ecrRepository?: string;
}

enum InspectImageErrorCode {
  Docker = 1,
  Podman = 125,
}

export interface DockerCacheOption {
  readonly type: string;
  readonly params?: { [key: string]: string };
}

export class Docker {
  private configDir: string | undefined = undefined;

  constructor(private readonly logger?: Logger) {}

  /**
   * Whether an image with the given tag exists
   */
  public async exists(tag: string) {
    try {
      await this.execute(["inspect", tag], { quiet: true });
      return true;
    } catch (e: any) {
      const error: ProcessFailedError = e;

      /**
       * The only error we expect to be thrown will have this property and value.
       * If it doesn't, it's unrecognized so re-throw it.
       */
      if (error.code !== "PROCESS_FAILED") {
        throw error;
      }

      /**
       * If we know the shell command above returned an error, check to see
       * if the exit code is one we know to actually mean that the image doesn't
       * exist.
       */
      switch (error.exitCode) {
        case InspectImageErrorCode.Docker:
        case InspectImageErrorCode.Podman:
          // Docker and Podman will return this exit code when an image doesn't exist, return false
          // context: https://github.com/aws/aws-cdk/issues/16209
          return false;
        default:
          // This is an error but it's not an exit code we recognize, throw.
          throw error;
      }
    }
  }

  public async build(options: BuildOptions) {
    const buildCommand = [
      "build",
      ...flatten(
        Object.entries(options.buildArgs || {}).map(([k, v]) => [
          "--build-arg",
          `${k}=${v}`,
        ])
      ),
      ...flatten(
        Object.entries(options.buildSecrets || {}).map(([k, v]) => [
          "--secret",
          `id=${k},${v}`,
        ])
      ),
      "--tag",
      options.tag,
      ...(options.target ? ["--target", options.target] : []),
      ...(options.file ? ["--file", options.file] : []),
      ...(options.networkMode ? ["--network", options.networkMode] : []),
      ...(options.platform ? ["--platform", options.platform] : []),
      ...(options.outputs
        ? options.outputs.map((output) => [`--output=${output}`])
        : []),
      ...(options.cacheFrom
        ? [
            ...options.cacheFrom
              .map((cacheFrom) => [
                "--cache-from",
                this.cacheOptionToFlag(cacheFrom),
              ])
              .flat(),
          ]
        : []),
      ...(options.cacheTo
        ? ["--cache-to", this.cacheOptionToFlag(options.cacheTo)]
        : []),
      ".",
    ];
    await this.execute(buildCommand, {
      cwd: options.directory,
      // TODO: remove after PR is merged
      quiet: options.quiet,
    });
  }

  /**
   * Get credentials from ECR and run docker login
   */
  public async login(ecr: AWS.ECR) {
    const credentials = await obtainEcrCredentials(ecr);

    // Use --password-stdin otherwise docker will complain. Loudly.
    await this.execute(
      [
        "login",
        "--username",
        credentials.username,
        "--password-stdin",
        credentials.endpoint,
      ],
      {
        input: credentials.password,

        // Need to quiet otherwise Docker will complain
        // 'WARNING! Your password will be stored unencrypted'
        // doesn't really matter since it's a token.
        quiet: true,
      }
    );
  }

  public async tag(sourceTag: string, targetTag: string) {
    await this.execute(["tag", sourceTag, targetTag]);
  }

  // TODO: remove after PR is merged
  public async push(options: PushOptions) {
    await this.execute(["push", options.tag], { quiet: options.quiet });
  }

  /**
   * If a CDK Docker Credentials file exists, creates a new Docker config directory.
   * Sets up `docker-credential-cdk-assets` to be the credential helper for each domain in the CDK config.
   * All future commands (e.g., `build`, `push`) will use this config.
   *
   * See https://docs.docker.com/engine/reference/commandline/login/#credential-helpers for more details on cred helpers.
   *
   * @returns true if CDK config was found and configured, false otherwise
   */
  public configureCdkCredentials(): boolean {
    const config = cdkCredentialsConfig();
    if (!config) {
      return false;
    }

    this.configDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdkDockerConfig"));

    const domains = Object.keys(config.domainCredentials);
    const credHelpers = domains.reduce(
      (map: Record<string, string>, domain) => {
        map[domain] = "cdk-assets"; // Use docker-credential-cdk-assets for this domain
        return map;
      },
      {}
    );
    fs.writeFileSync(
      path.join(this.configDir, "config.json"),
      JSON.stringify({ credHelpers }),
      { encoding: "utf-8" }
    );

    return true;
  }

  /**
   * Removes any configured Docker config directory.
   * All future commands (e.g., `build`, `push`) will use the default config.
   *
   * This is useful after calling `configureCdkCredentials` to reset to default credentials.
   */
  public resetAuthPlugins() {
    this.configDir = undefined;
  }

  private async execute(args: string[], options: ShellOptions = {}) {
    const configArgs = this.configDir ? ["--config", this.configDir] : [];

    // TODO: remove after PR is merged
    //const pathToCdkAssets = path.resolve(__dirname, "..", "..", "bin");
    const pathToCdkAssets = "";
    try {
      await shell([getDockerCmd(), ...configArgs, ...args], {
        logger: this.logger,
        ...options,
        env: {
          ...process.env,
          ...options.env,
          PATH: `${pathToCdkAssets}${path.delimiter}${
            options.env?.PATH ?? process.env.PATH
          }`,
        },
      });
    } catch (e: any) {
      if (e.code === "ENOENT") {
        throw new Error(
          "Unable to execute 'docker' in order to build a container asset. Please install 'docker' and try again."
        );
      }
      throw e;
    }
  }

  private cacheOptionToFlag(option: DockerCacheOption): string {
    let flag = `type=${option.type}`;
    if (option.params) {
      flag +=
        "," +
        Object.entries(option.params)
          .map(([k, v]) => `${k}=${v}`)
          .join(",");
    }
    return flag;
  }
}

export interface DockerFactoryOptions {
  readonly repoUri: string;
  readonly ecr: AWS.ECR;
  readonly logger: (m: string) => void;
}

/**
 * Helps get appropriately configured Docker instances during the container
 * image publishing process.
 */
export class DockerFactory {
  private enterLoggedInDestinationsCriticalSection = createCriticalSection();
  private loggedInDestinations = new Set<string>();

  /**
   * Gets a Docker instance for building images.
   */
  public async forBuild(options: DockerFactoryOptions): Promise<Docker> {
    const docker = new Docker(options.logger);

    // Default behavior is to login before build so that the Dockerfile can reference images in the ECR repo
    // However, if we're in a pipelines environment (for example),
    // we may have alternative credentials to the default ones to use for the build itself.
    // If the special config file is present, delay the login to the default credentials until the push.
    // If the config file is present, we will configure and use those credentials for the build.
    let cdkDockerCredentialsConfigured = docker.configureCdkCredentials();
    if (!cdkDockerCredentialsConfigured) {
      await this.loginOncePerDestination(docker, options);
    }

    return docker;
  }

  /**
   * Gets a Docker instance for pushing images to ECR.
   */
  public async forEcrPush(options: DockerFactoryOptions) {
    const docker = new Docker(options.logger);
    await this.loginOncePerDestination(docker, options);
    return docker;
  }

  private async loginOncePerDestination(
    docker: Docker,
    options: DockerFactoryOptions
  ) {
    // Changes: 012345678910.dkr.ecr.us-west-2.amazonaws.com/tagging-test
    // To this: 012345678910.dkr.ecr.us-west-2.amazonaws.com
    const repositoryDomain = options.repoUri.split("/")[0];

    // Ensure one-at-a-time access to loggedInDestinations.
    await this.enterLoggedInDestinationsCriticalSection(async () => {
      if (this.loggedInDestinations.has(repositoryDomain)) {
        return;
      }

      await docker.login(options.ecr);
      this.loggedInDestinations.add(repositoryDomain);
    });
  }
}

function getDockerCmd(): string {
  return process.env.CDK_DOCKER ?? "docker";
}

function flatten(x: string[][]) {
  return Array.prototype.concat([], ...x);
}
