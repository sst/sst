import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import type { Program } from "../program.js";
import { lazy } from "../../util/lazy.js";

export const dev = (program: Program) =>
  program.command(
    ["dev", "start"],
    "Work on your app locally",
    (yargs) =>
      yargs.option("increase-timeout", {
        type: "boolean",
        description: "Increase function timeout",
      }),
    async (args) => {
      const { Colors } = await import("../colors.js");
      const { printHeader } = await import("../ui/header.js");
      const { mapValues } = await import("remeda");
      const path = await import("path");
      const { useRuntimeWorkers } = await import("../../runtime/workers.js");
      const { useIOTBridge } = await import("../../runtime/iot.js");
      const { useRuntimeServer } = await import("../../runtime/server.js");
      const { useBus } = await import("../../bus.js");
      const { useWatcher } = await import("../../watcher.js");
      const { useAppMetadata, saveAppMetadata, Stacks } = await import(
        "../../stacks/index.js"
      );
      const { exit, exitWithError, trackDevError, trackDevRunning } =
        await import("../program.js");
      const { Logger } = await import("../../logger.js");
      const { createSpinner } = await import("../spinner.js");
      const { bold, dim, yellow } = await import("colorette");
      const { render } = await import("ink");
      const React = await import("react");
      const { Context } = await import("../../context/context.js");
      const { printDeploymentResults, DeploymentUI } = await import(
        "../ui/deploy.js"
      );
      const { useLocalServer } = await import("../local/server.js");
      const fs = await import("fs/promises");
      const crypto = await import("crypto");
      const { useFunctions } = await import("../../constructs/Function.js");
      const { useSites } = await import("../../constructs/SsrSite.js");
      const { usePothosBuilder } = await import("./plugins/pothos.js");
      const { useKyselyTypeGenerator } = await import("./plugins/kysely.js");
      const { useRDSWarmer } = await import("./plugins/warmer.js");
      const { useProject } = await import("../../project.js");
      const { useMetadataCache } = await import("../../stacks/metadata.js");
      const { useIOT } = await import("../../iot.js");
      const { clear } = await import("../terminal.js");
      const { getCiInfo } = await import("../ci-info.js");

      try {
        if (args._[0] === "start") {
          console.log(
            yellow(
              `Warning: ${bold(`sst start`)} has been renamed to ${bold(
                `sst dev`
              )}`
            )
          );
        }

        const project = useProject();

        const useFunctionLogger = lazy(async () => {
          const bus = useBus();

          const colors = ["#01cdfe", "#ff71ce", "#05ffa1", "#b967ff"];
          let index = 0;

          interface Pending {
            requestID: string;
            started: number;
            color: string;
          }
          const pending = new Map<string, Pending>();

          function prefix(requestID: string): string {
            const exists = pending.get(requestID);
            if (exists) {
              return Colors.hex(exists.color)(Colors.prefix);
            }
            pending.set(requestID, {
              requestID,
              started: Date.now(),
              color: colors[index % colors.length],
            });
            index++;
            return prefix(requestID);
          }
          function end(requestID: string) {
            // index--;
            // if (index < 0) index = colors.length - 1;
            pending.delete(requestID);
          }

          bus.subscribe("function.invoked", async (evt) => {
            Colors.line(
              prefix(evt.properties.requestID),
              Colors.dim.bold("Invoked"),
              Colors.dim(
                useFunctions().fromID(evt.properties.functionID)?.handler
              )
            );
          });

          bus.subscribe("worker.stdout", async (evt) => {
            const info = useFunctions().fromID(evt.properties.functionID);
            prefix(evt.properties.requestID);
            const { started } = pending.get(evt.properties.requestID)!;
            for (let line of evt.properties.message.split("\n")) {
              // Remove prefix from container logs
              if (info?.runtime === "container") {
                // handle Node.js container logs
                // ie. 2023-07-05T00:13:42.448Z\td7330533-2429-4871-a632-ed29a1d32246\tINFO\tfoo!
                const parts = line.split("\t");
                if (
                  parts.length >= 4 &&
                  Date.parse(parts[0]) &&
                  parts[1].length === 36
                ) {
                  line = parts.slice(3).join("\t");
                }
              }
              Colors.line(
                prefix(evt.properties.requestID),
                Colors.dim(("+" + (Date.now() - started) + "ms").padEnd(7)),
                Colors.dim(line)
              );
            }
          });

          bus.subscribe("function.build.started", async (evt) => {
            const info = useFunctions().fromID(evt.properties.functionID);
            if (!info) return;
            if (info.enableLiveDev === false) return;
            if (info.runtime !== "container") return;
            Colors.line(
              Colors.dim(Colors.prefix, "Building", info.handler!, "container")
            );
          });

          bus.subscribe("function.build.success", async (evt) => {
            const info = useFunctions().fromID(evt.properties.functionID);
            if (!info) return;
            if (info.enableLiveDev === false) return;
            Colors.line(
              info.runtime === "container"
                ? Colors.dim(Colors.prefix, "Built", info.handler!, "container")
                : Colors.dim(Colors.prefix, "Built", info.handler!)
            );
          });

          bus.subscribe("function.build.failed", async (evt) => {
            const info = useFunctions().fromID(evt.properties.functionID);
            if (!info) return;
            if (info.enableLiveDev === false) return;
            Colors.gap();
            Colors.line(Colors.danger("✖ "), "Build failed", info.handler!);
            for (const line of evt.properties.errors) {
              Colors.line("  ", line);
            }
            Colors.gap();
          });

          bus.subscribe("function.success", async (evt) => {
            // stdout logs sometimes come in after
            const p = prefix(evt.properties.requestID);
            const req = pending.get(evt.properties.requestID)!;
            setTimeout(() => {
              Colors.line(
                p,
                Colors.dim(`Done in ${Date.now() - req.started - 100}ms`)
              );
              end(evt.properties.requestID);
            }, 100);
          });

          bus.subscribe("function.error", async (evt) => {
            setTimeout(() => {
              Colors.line(
                prefix(evt.properties.requestID),
                Colors.danger.bold("Error:"),
                Colors.danger.bold(evt.properties.errorMessage)
              );
              for (const line of evt.properties.trace || []) {
                // Skip double printing error message
                if (line.includes(evt.properties.errorMessage)) continue;
                Colors.line("  ", `${dim(line)}`);
              }
              end(evt.properties.requestID);
            }, 100);
          });
        });

        const useStackBuilder = lazy(async () => {
          const watcher = useWatcher();

          const scriptVersion = Date.now().toString();
          let lastDeployed: string;
          let isWorking = false;
          let isDirty = false;

          async function build() {
            if (isWorking) {
              isDirty = true;
              return;
            }
            isDirty = false;
            isWorking = true;
            Colors.gap();
            const spinner = createSpinner({
              color: "gray",
              text: lastDeployed
                ? ` Building...`
                : dim(` Checking for changes`),
            }).start();
            try {
              const [metafile, sstConfig] = await Stacks.load(
                project.paths.config
              );
              project.metafile = metafile;
              project.stacks = sstConfig.stacks;
              const assembly = await Stacks.synth({
                increaseTimeout: args["increase-timeout"],
                scriptVersion,
                fn: project.stacks,
                outDir: `.sst/cdk.out`,
                mode: "dev",
              });

              Logger.debug("Directory", assembly.directory);
              const next = await checksum(assembly.directory);
              Logger.debug("Checksum", "next", next, "old", lastDeployed);
              if (next === lastDeployed) {
                spinner.succeed(Colors.dim(" Built with no changes"));
                isWorking = false;
                if (isDirty) build();
                return;
              }
              if (!lastDeployed) {
                spinner.stop();
                spinner.clear();
                Colors.mode("gap");
              } else {
                spinner.succeed(Colors.dim(` Built`));
                Colors.gap();
              }
              deploy(assembly);
            } catch (ex: any) {
              isWorking = false;
              spinner.fail();
              Colors.line(
                ex.stack
                  .split("\n")
                  .map((line: any) => "   " + line)
                  .join("\n")
              );
              Colors.gap();

              if (!lastDeployed) {
                trackDevError(ex);
              }
            }
          }

          async function deploy(assembly: CloudAssembly) {
            const nextChecksum = await checksum(assembly.directory);

            const component = render(<DeploymentUI assembly={assembly} />);
            const results = await Stacks.deployMany(assembly.stacks);
            component.clear();
            component.unmount();
            printDeploymentResults(assembly, results);

            // Run after initial deploy
            if (!lastDeployed) {
              await saveAppMetadata({ mode: "dev" });

              // Check failed stacks
              const failed = Object.values(results).find((result) =>
                Stacks.isFailed(result.status)
              );
              failed
                ? trackDevError(
                    new Error(`CloudFormation status ${failed.status}`)
                  )
                : trackDevRunning();
              // print start frontend commands
              useSites()
                .all.filter(({ props }) => props.dev?.deploy !== true)
                .forEach(({ type, props }) => {
                  const framework =
                    type === "AstroSite"
                      ? "Astro"
                      : type === "NextjsSite"
                      ? "Next.js"
                      : type === "RemixSite"
                      ? "Remix"
                      : type === "SolidStartSite"
                      ? "SolidStart"
                      : type === "SvelteKitSite"
                      ? "SvelteKit"
                      : undefined;
                  if (framework) {
                    const cdCmd =
                      path.resolve(props.path) === process.cwd()
                        ? ""
                        : `cd ${props.path} && `;
                    Colors.line(
                      Colors.primary(`➜ `),
                      Colors.bold(`Start ${framework}:`),
                      `${cdCmd}npm run dev`
                    );
                    Colors.gap();
                  }
                });
            }

            lastDeployed = nextChecksum;

            // Write outputs.json
            fs.writeFile(
              project.config.outputs ||
                path.join(project.paths.out, "outputs.json"),
              JSON.stringify(
                mapValues(results, (val) => val.outputs),
                null,
                2
              )
            );

            isWorking = false;
            if (isDirty) build();
          }

          async function checksum(cdkOutPath: string) {
            const manifestPath = path.join(cdkOutPath, "manifest.json");
            const cdkManifest = JSON.parse(
              await fs.readFile(manifestPath).then((x) => x.toString())
            );
            const checksumData = await Promise.all(
              Object.keys(cdkManifest.artifacts)
                .filter(
                  (key: string) =>
                    cdkManifest.artifacts[key].type ===
                    "aws:cloudformation:stack"
                )
                .map(async (key: string) => {
                  const { templateFile } =
                    cdkManifest.artifacts[key].properties;
                  const templatePath = path.join(cdkOutPath, templateFile);
                  const templateContent = await fs.readFile(templatePath);
                  return templateContent;
                })
            ).then((x) => x.join("\n"));
            const hash = crypto
              .createHash("sha256")
              .update(checksumData)
              .digest("hex");
            return hash;
          }

          watcher.subscribe("file.changed", async (evt) => {
            if (!project.metafile) return;
            if (
              !project.metafile.inputs[
                evt.properties.relative.split(path.sep).join(path.posix.sep)
              ]
            )
              return;
            build();
          });

          await build();
        });

        const useDisconnector = lazy(async () => {
          const bus = useBus();
          const iot = await useIOT();

          bus.subscribe("cli.dev", async (evt) => {
            const topic = `${iot.prefix}/events`;
            iot.publish(topic, "cli.dev", evt.properties);
          });

          bus.publish("cli.dev", {
            stage: project.config.stage,
            app: project.config.name,
          });

          bus.subscribe("cli.dev", async (evt) => {
            if (evt.properties.stage !== project.config.stage) return;
            if (evt.properties.app !== project.config.name) return;
            Colors.gap();
            Colors.line(
              Colors.danger(`➜ `),
              "Another `sst dev` session has been started for this stage. Exiting..."
            );
            await exit();
          });
        });

        const [appMetadata] = await Promise.all([
          useAppMetadata(),
          useLocalServer({
            key: "",
            cert: "",
            live: true,
          }),
        ]);

        async function promptChangeMode() {
          const readline = await import("readline");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          return new Promise<boolean>((resolve) => {
            console.log("");
            rl.question(
              `You have previously deployed the stage "${project.config.stage}" in production. It is recommended that you use a different stage for development. Read more here — https://docs.sst.dev/live-lambda-development\n\nAre you sure you want to run this stage in dev mode? [y/N] `,
              async (input) => {
                rl.close();
                resolve(input.trim() === "y");
              }
            );
          });
        }
        // Check app mode changed
        if (
          !project.config.advanced?.disableAppModeCheck &&
          !getCiInfo().isCI &&
          appMetadata &&
          appMetadata.mode !== "dev"
        ) {
          if (!(await promptChangeMode())) {
            await exit();
          }
        }

        clear();
        await printHeader({ console: true, hint: "ready!" });
        await useStackBuilder();
        await Promise.all([
          useDisconnector(),
          useRuntimeWorkers(),
          useIOTBridge(),
          useRuntimeServer(),
          usePothosBuilder(),
          useMetadataCache(),
          useKyselyTypeGenerator(),
          useRDSWarmer(),
          useFunctionLogger(),
        ]);
      } catch (e: any) {
        await exitWithError(e);
      }
    }
  );

declare module "../../bus.js" {
  interface Events {
    "cli.dev": {
      app: string;
      stage: string;
    };
  }
}
