import path from "path";
import { VisibleError } from "../../error.js";
import type { Program } from "../program.js";
import type {
  SlsNextjsMetadata,
  SsrSiteMetadata,
  StaticSiteMetadata,
} from "../../constructs/Metadata.js";

const SITE_CONFIG = {
  NextjsSite: "next.config",
  AstroSite: "astro.config",
  RemixSite: "remix.config",
  SolidStartSite: "vite.config",
  StaticSite: "vite.config",
  SlsNextjsSite: "next.config",
};
type BIND_REASON =
  | "init"
  | "metadata_updated"
  | "secrets_updated"
  | "iam_expired";

export const bind = (program: Program) =>
  program
    .command(
      ["bind <command..>", "env <command..>"],
      "Bind your app's resources to a command",
      (yargs) =>
        yargs
          .array("command")
          .example(`sst bind "vitest run"`, "Bind your resources to your tests")
          .example(
            `sst bind "tsx scripts/myscript.ts"`,
            "Bind your resources to a script"
          ),
      async (args) => {
        const { spawn } = await import("child_process");
        const { useProject } = await import("../../project.js");
        const { useBus } = await import("../../bus.js");
        const { useIOT } = await import("../../iot.js");
        const { Colors } = await import("../colors.js");

        if (args._[0] === "env") {
          Colors.line(
            Colors.warning(
              `Warning: ${Colors.bold(
                `sst env`
              )} has been renamed to ${Colors.bold(`sst bind`)}`
            )
          );
        }

        await useIOT();
        const bus = useBus();
        const project = useProject();
        const command = args.command?.join(" ");
        const isFrontend = await isRunningInFrontend();
        let p: ReturnType<typeof spawn> | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let metadataCache:
          | Awaited<ReturnType<typeof getSiteMetadata>>
          | undefined;

        // Handle missing command
        if (!command) {
          throw new VisibleError(
            `Command is required, e.g. sst bind ${
              isFrontend ? "next dev" : "env"
            }`
          );
        }

        // Bind script
        const initialMetadata = await getSiteMetadata();
        if (!initialMetadata) {
          return await bindScript();
        }

        // Bind site
        await bindSite("init");
        bus.subscribe("stacks.metadata.updated", () =>
          bindSite("metadata_updated")
        );
        bus.subscribe("stacks.metadata.deleted", () =>
          bindSite("metadata_updated")
        );
        bus.subscribe("config.secret.updated", (payload) => {
          const secretName = payload.properties.name;
          if (metadataCache?.secrets === undefined) return;
          if (!metadataCache.secrets.includes(secretName)) return;

          Colors.line(
            `\n`,
            `SST secrets have been updated. Restarting \`${command}\`...`
          );
          bindSite("secrets_updated");
        });

        async function isRunningInFrontend() {
          const { existsAsync } = await import("../../util/fs.js");
          const results = await Promise.all(
            Object.values(SITE_CONFIG)
              .map((config) =>
                [".js", ".cjs", ".mjs", ".ts"].map((ext) =>
                  existsAsync(`${config}${ext}`)
                )
              )
              .flat()
          );
          return results.some(Boolean);
        }

        async function bindSite(reason: BIND_REASON) {
          // Get metadata
          const metadata = (
            reason === "init" ? initialMetadata : await getSiteMetadata()
          )!;

          // Handle rebind due to metadata updated
          if (reason === "metadata_updated") {
            if (areEnvsSame(metadata.envs, metadataCache?.envs || {})) return;
            Colors.line(
              `\n`,
              `SST resources have been updated. Restarting \`${command}\`...`
            );
          }
          metadataCache = metadata;

          // Assume function's role credentials
          if (metadata.role) {
            const credentials = await assumeSsrRole(metadata.role);
            if (credentials) {
              // refresh crecentials 1 minute before expiration
              const expireAt = credentials.Expiration!.getTime() - 60000;
              clearTimeout(timer);
              timer = setTimeout(() => {
                Colors.line(
                  `\n`,
                  `Your AWS session is about to expire. Creating a new session and restarting \`${command}\`...`
                );
                bindSite("iam_expired");
              }, expireAt - Date.now());

              runCommand({
                ...metadata.envs,
                AWS_ACCESS_KEY_ID: credentials!.AccessKeyId,
                AWS_SECRET_ACCESS_KEY: credentials!.SecretAccessKey,
                AWS_SESSION_TOKEN: credentials!.SessionToken,
              });
              return;
            }
          }

          // Fallback to use local IAM credentials
          runCommand({
            ...metadata.envs,
            ...(await localIamCredentials()),
          });
        }

        async function bindScript() {
          const { Config } = await import("../../config.js");
          runCommand({
            ...(await Config.env()),
            ...(await localIamCredentials()),
          });
        }

        async function getSiteMetadata() {
          const { metadata } = await import("../../stacks/metadata.js");
          const { createSpinner } = await import("../spinner.js");
          const { LambdaClient, GetFunctionCommand } = await import(
            "@aws-sdk/client-lambda"
          );
          const { useAWSClient } = await import("../../credentials.js");
          const spinner = createSpinner({});
          while (true) {
            const metadataData = await metadata();
            const data = Object.values(metadataData)
              .flat()
              .filter(
                (
                  c
                ): c is
                  | SsrSiteMetadata
                  | StaticSiteMetadata
                  | SlsNextjsMetadata => Boolean(c)
              )
              .filter((c) => Boolean(SITE_CONFIG[c.type]))
              .find(
                (c) =>
                  path.resolve(project.paths.root, c.data.path) ===
                  process.cwd()
              );

            // Do not retry if not running in frontend
            if (!data && !isFrontend) {
              return;
            }

            // Handle site metadata not found
            if (!data) {
              spinner.start(
                //"Waiting for SST to start for the first time. Run `sst dev`..."
                //"Run `sst dev` for the first time. Waiting..."
                "Make sure `sst dev` is running..."
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }

            // Handle site metadata is old
            const isBindSupported =
              data.type !== "StaticSite" && data.type !== "SlsNextjsSite";
            if (
              (isBindSupported && !data.data.server) ||
              (!isBindSupported && !data.data.environment)
            ) {
              spinner.start(
                "This was deployed with an old version of SST. Make sure to restart `sst dev`..."
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            spinner.isSpinning && spinner.stop().clear();

            // Handle StaticSite
            if (!isBindSupported) {
              return { envs: data.data.environment };
            }

            // Get function details
            const lambda = useAWSClient(LambdaClient);
            const { Configuration: functionConfig } = await lambda.send(
              new GetFunctionCommand({
                FunctionName: data.data.server,
              })
            );

            return {
              role: functionConfig?.Role!,
              envs: functionConfig?.Environment?.Variables || {},
              secrets: data.data.secrets,
            };
          }
        }

        async function assumeSsrRole(roleArn: string) {
          const { STSClient, AssumeRoleCommand } = await import(
            "@aws-sdk/client-sts"
          );
          const { Logger } = await import("../../logger.js");
          const { useAWSClient } = await import("../../credentials.js");
          const sts = useAWSClient(STSClient);
          const assumeRole = async (duration: number) => {
            const { Credentials: credentials } = await sts.send(
              new AssumeRoleCommand({
                RoleArn: roleArn,
                RoleSessionName: "dev-session",
                DurationSeconds: duration,
              })
            );
            return credentials;
          };

          // Assue role with max duration first. This can fail if chaining roles, or if
          // the role has a max duration set. If it fails, assume role with 1 hour duration.
          let err: any;
          try {
            return await assumeRole(43200);
          } catch (e) {
            err = e;
          }

          if (
            err.name === "ValidationError" &&
            err.message.startsWith("The requested DurationSeconds exceeds")
          ) {
            try {
              return await assumeRole(3600);
            } catch (e) {
              err = e;
            }
          }

          Colors.line(
            Colors.warning(
              `Failed to assume SSR role ${roleArn}. Falling back to using local IAM credentials.`
            )
          );
          Logger.debug(`Failed to assume ${roleArn}.`, err);
        }

        async function localIamCredentials() {
          const { useAWSCredentials } = await import("../../credentials.js");
          const credentials = await useAWSCredentials();
          return {
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
          };
        }

        function runCommand(envs: Record<string, string | undefined>) {
          Colors.gap();

          if (p) {
            p.kill();
          }

          p = spawn(command!, {
            env: {
              ...process.env,
              ...envs,
              AWS_REGION: project.config.region,
            },
            stdio: "inherit",
            shell: true,
          });

          p.on("exit", (code) => {
            process.exit();
          });
        }

        function areEnvsSame(
          envs1: Record<string, string | undefined>,
          envs2: Record<string, string | undefined>
        ) {
          return (
            Object.keys(envs1).length === Object.keys(envs2).length &&
            Object.keys(envs1).every((key) => envs1[key] === envs2[key])
          );
        }
      }
    )
    .strict(false);
