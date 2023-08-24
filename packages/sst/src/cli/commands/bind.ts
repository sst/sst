import path from "path";
import { VisibleError } from "../../error.js";
import type { Program } from "../program.js";
import type {
  ServiceMetadata,
  SlsNextjsMetadata,
  SSRSiteMetadata,
  StaticSiteMetadata,
} from "../../constructs/Metadata.js";

type BIND_REASON =
  | "init"
  | "metadata_updated"
  | "secrets_updated"
  | "iam_expired";

class MetadataNotFoundError extends Error {}
class MetadataOutdatedError extends Error {}

export const bind = (program: Program) =>
  program
    .command(
      ["bind <command..>", "env <command..>"],
      "Bind your app's resources to a command",
      (yargs) =>
        yargs
          .option("script", {
            type: "boolean",
            describe: "Run in script mode",
          })
          .array("command")
          .example(`sst bind vitest run`, "Bind resources to your tests")
          .example(`sst bind next dev`, "Bind resources to your site")
          .example(
            `sst bind --script next build`,
            "Bind resources to your site before deployment"
          ),
      async (args) => {
        const { Token } = await import("aws-cdk-lib");
        const { spawn } = await import("child_process");
        const kill = await import("tree-kill");
        const { useProject } = await import("../../project.js");
        const { Stacks } = await import("../../stacks/index.js");
        const { useBus } = await import("../../bus.js");
        const { useIOT } = await import("../../iot.js");
        const { Colors } = await import("../colors.js");
        const { Logger } = await import("../../logger.js");
        const [
          { useServices },
          { useSites: useSsrSites },
          { useSites: useStaticSites },
          { useSites: useSlsNextjsSites },
          { Parameter },
          { getEnvironmentKey },
        ] = await Promise.all([
          import("../../constructs/Service.js"),
          import("../../constructs/SsrSite.js"),
          import("../../constructs/StaticSite.js"),
          import("../../constructs/deprecated/NextjsSite.js"),
          import("../../constructs/Config.js"),
          import("../../constructs/util/functionBinding.js"),
        ]);

        // Handle deprecated "env" command
        if (args._[0] === "env") {
          Colors.line(
            Colors.warning(
              `Warning: ${Colors.bold(
                `sst env`
              )} has been renamed to ${Colors.bold(`sst bind`)}`
            )
          );
        }

        // Handle missing command
        const command = args.command?.join(" ");
        if (!command) {
          throw new VisibleError(
            "Command is required, e.g. sst bind npm run script"
          );
        }

        await useIOT();
        const bus = useBus();
        const project = useProject();
        let p: ReturnType<typeof spawn> | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let siteConfigCache:
          | Awaited<ReturnType<typeof getSsrSiteMetadata>>
          | Awaited<ReturnType<typeof getStaticSiteMetadata>>
          | Awaited<ReturnType<typeof getServiceMetadata>>;

        await buildApp();

        const ssrSite = isInSsrSite();
        const staticSite = isInStaticSite();
        const service = isInService();

        // Run the script
        if (args.script || (!ssrSite && !staticSite && !service)) {
          return await runScript();
        }

        // Run the app
        try {
          await runSite("init");
        } catch (e: any) {
          if (
            !(e instanceof MetadataOutdatedError) &&
            !(e instanceof MetadataNotFoundError)
          ) {
            return;
          }

          Colors.line(
            Colors.warning(
              e instanceof MetadataOutdatedError
                ? "Warning: This was deployed with an old version of SST. Run `sst dev` or `sst deploy` to update."
                : "Warning: The site has not been deployed. Some resources might not be available."
            )
          );
          return await runSiteUndeployed();
        }

        bus.subscribe("stacks.metadata.updated", () =>
          runSite("metadata_updated")
        );
        bus.subscribe("stacks.metadata.deleted", () =>
          runSite("metadata_updated")
        );
        bus.subscribe("config.secret.updated", (payload) => {
          const secretName = payload.properties.name;
          if (!siteConfigCache.secrets.includes(secretName)) return;

          Colors.line(
            `\n`,
            `SST secrets have been updated. Restarting \`${command}\`...`
          );
          runSite("secrets_updated");
        });

        async function buildApp() {
          const [_metafile, sstConfig] = await Stacks.load(
            project.paths.config
          );
          const cwd = process.cwd();
          process.chdir(project.paths.root);
          await Stacks.synth({
            fn: sstConfig.stacks,
            mode: "remove",
          });
          process.chdir(cwd);
        }

        function isInSsrSite() {
          const cwd = process.cwd();
          return useSsrSites().all.find(({ props }) => {
            return path.resolve(project.paths.root, props.path) === cwd;
          });
        }

        function isInStaticSite() {
          const cwd = process.cwd();
          return (
            useStaticSites().all.find(({ props }) => {
              return path.resolve(project.paths.root, props.path) === cwd;
            }) ||
            useSlsNextjsSites().all.find(({ props }) => {
              return path.resolve(project.paths.root, props.path) === cwd;
            })
          );
        }

        function isInService() {
          const cwd = process.cwd();
          return useServices().all.find(({ props }) => {
            return path.resolve(project.paths.root, props.path) === cwd;
          });
        }

        async function runSite(reason: BIND_REASON) {
          const siteConfig = ssrSite
            ? await getSsrSiteMetadata()
            : staticSite
            ? await getStaticSiteMetadata()
            : await getServiceMetadata();

          // Handle rebind due to metadata updated
          if (reason === "metadata_updated") {
            if (areEnvsSame(siteConfig.envs, siteConfigCache?.envs || {}))
              return;
            Colors.line(
              `\n`,
              `SST resources have been updated. Restarting \`${command}\`...`
            );
          }
          siteConfigCache = siteConfig;

          // Assume function's role credentials
          // Fallback to use local IAM credentials
          const credentials =
            (siteConfig.role &&
              (await getLiveIamCredentials(siteConfig.role))) ||
            (await getLocalIamCredentials());
          await runCommand({
            ...siteConfig.envs,
            ...credentials,
          });
        }

        async function runSiteUndeployed() {
          // Note: when the site is undeployed:
          // - bind all resources
          // - bind resources that are constant (ie. Config.Parameter)
          // - set environment variables that are constant
          const constructEnvs: Record<string, string> = {};
          Object.entries(
            (ssrSite || staticSite || service)?.props.environment || {}
          )
            .filter(([key, value]) => !Token.isUnresolved(value))
            .forEach(([key, value]) => (constructEnvs[key] = value));
          ((ssrSite || service)?.props.bind || []).forEach((b) => {
            if (b instanceof Parameter && !Token.isUnresolved(b.value)) {
              constructEnvs[getEnvironmentKey(b, "name")] = b.value;
            }
          });

          const { Config } = await import("../../config.js");
          await runCommand({
            ...constructEnvs,
            ...(await Config.env()),
            ...(await getLocalIamCredentials()),
          });
        }

        async function runScript() {
          const { Config } = await import("../../config.js");
          await runCommand({
            ...(await Config.env()),
            ...(await getLocalIamCredentials()),
          });
        }

        async function getSsrSiteMetadata() {
          const [
            { metadataForStack },
            { LambdaClient, GetFunctionCommand },
            { useAWSClient },
          ] = await Promise.all([
            import("../../stacks/metadata.js"),
            import("@aws-sdk/client-lambda"),
            import("../../credentials.js"),
          ]);
          const metadataData = await metadataForStack(ssrSite!.stack);
          const metadata = metadataData
            ?.filter((c): c is SSRSiteMetadata =>
              [
                "NextjsSite",
                "AstroSite",
                "RemixSite",
                "SolidStartSite",
                "SvelteKitSite",
              ].includes(c.type)
            )
            .find((c) => {
              // metadata prior to SST v2.3.0 doesn't have path
              if (!c.data.path || !c.data.server) {
                throw new MetadataOutdatedError();
              }
              return (
                path.resolve(project.paths.root, c.data.path) === process.cwd()
              );
            });
          if (!metadata) throw new MetadataNotFoundError();

          // Parse metadata
          const lambda = useAWSClient(LambdaClient);
          const { Configuration: functionConfig } = await lambda.send(
            new GetFunctionCommand({
              FunctionName: (metadata as SSRSiteMetadata).data.server,
            })
          );
          return {
            role: functionConfig?.Role!,
            envs: functionConfig?.Environment?.Variables || {},
            secrets: metadata.data.secrets,
          };
        }

        async function getStaticSiteMetadata() {
          const { metadataForStack } = await import("../../stacks/metadata.js");
          const metadataData = await metadataForStack(staticSite!.stack);
          const metadata = metadataData
            ?.filter((c): c is StaticSiteMetadata | SlsNextjsMetadata =>
              ["StaticSite", "SlsNextjsSite"].includes(c.type)
            )
            .find((c) => {
              // metadata prior to SST v2.3.0 doesn't have path
              if (!c.data.path || !c.data.environment) {
                throw new MetadataOutdatedError();
              }

              return (
                path.resolve(project.paths.root, c.data.path) === process.cwd()
              );
            });

          if (!metadata) throw new MetadataNotFoundError();

          return {
            envs: metadata.data.environment,
            role: undefined,
            secrets: [] as string[],
          };
        }

        async function getServiceMetadata() {
          const [
            { metadataForStack },
            { LambdaClient, GetFunctionCommand },
            { ECSClient, DescribeTaskDefinitionCommand },
            { useAWSClient },
          ] = await Promise.all([
            import("../../stacks/metadata.js"),
            import("@aws-sdk/client-lambda"),
            import("@aws-sdk/client-ecs"),
            import("../../credentials.js"),
          ]);

          // Get metadata
          const metadataData = await metadataForStack(service!.stack);
          const metadata = metadataData
            ?.filter((c): c is ServiceMetadata => ["Service"].includes(c.type))
            .find((c) => {
              return (
                path.resolve(project.paths.root, c.data.path) === process.cwd()
              );
            });
          if (!metadata) throw new MetadataNotFoundError();

          // Parse metadata for "sst deploy"
          if (metadata.data.mode === "deployed") {
            const ecs = useAWSClient(ECSClient);
            const task = await ecs.send(
              new DescribeTaskDefinitionCommand({
                taskDefinition: metadata.data.task!,
              })
            );
            const envs: Record<string, string> = {};
            (
              task?.taskDefinition?.containerDefinitions![0].environment || []
            ).forEach(({ name, value }) => (envs[name!] = value!));
            return {
              role: task?.taskDefinition?.taskRoleArn!,
              envs,
              secrets: metadata.data.secrets,
            };
          }

          // Parse metadata for "sst dev"
          const lambda = useAWSClient(LambdaClient);
          const { Configuration: functionConfig } = await lambda.send(
            new GetFunctionCommand({
              FunctionName: metadata.data.devFunction,
            })
          );
          return {
            role: functionConfig?.Role!,
            envs: functionConfig?.Environment?.Variables || {},
            secrets: metadata.data.secrets,
          };
        }

        async function getLiveIamCredentials(roleArn: string) {
          const credentials = await assumeSsrRole(roleArn);
          if (!credentials) return;

          // refresh crecentials 1 minute before expiration
          const expireAt = credentials.Expiration!.getTime() - 60000;
          clearTimeout(timer);
          timer = setTimeout(() => {
            Colors.line(
              `\n`,
              `Your AWS session is about to expire. Creating a new session and restarting \`${command}\`...`
            );
            runSite("iam_expired");
          }, expireAt - Date.now());

          return {
            AWS_ACCESS_KEY_ID: credentials!.AccessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials!.SecretAccessKey,
            AWS_SESSION_TOKEN: credentials!.SessionToken,
          };
        }

        async function getLocalIamCredentials() {
          const { useAWSCredentials } = await import("../../credentials.js");
          const credentials = await useAWSCredentials();
          return {
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
          };
        }

        async function runCommand(envs: Record<string, string | undefined>) {
          Colors.gap();

          if (p) {
            p.removeAllListeners("exit");
            // Note: calling p.kill() does not kill child processes. And in the
            // cases of Next.js and CRA, servers are child processes. Need to
            // kill the entire process tree to free up port ie. 3000.
            await new Promise((resolve, reject) => {
              kill.default(p?.pid!, (error) => {
                if (error) {
                  return reject(error);
                }
                resolve(true);
              });
            });
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
            process.exit(code || 0);
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

        async function assumeSsrRole(roleArn: string) {
          const { STSClient, AssumeRoleCommand } = await import(
            "@aws-sdk/client-sts"
          );
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

          // Assume role with max duration first. This can fail if chaining roles, or if
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
            "Using local IAM credentials since `sst dev` is not running."
          );
          Logger.debug(`Failed to assume ${roleArn}.`, err);
        }
      }
    )
    .strict(false);
