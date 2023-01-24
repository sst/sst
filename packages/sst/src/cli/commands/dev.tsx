import type { Program } from "../program.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import chalk from "chalk";
import { Colors } from "../colors.js";
import { useLocalServerConfig } from "../local/server.js";
import { printHeader } from "../ui/header.js";

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
      const { useRuntimeWorkers } = await import("../../runtime/workers.js");
      const { useIOTBridge } = await import("../../runtime/iot.js");
      const { useRuntimeServer } = await import("../../runtime/server.js");
      const { useBus } = await import("../../bus.js");
      const { useWatcher } = await import("../../watcher.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { Logger } = await import("../../logger.js");
      const { createSpinner } = await import("../spinner.js");
      const { bold, magenta, green, blue, red } = await import("colorette");
      const { render } = await import("ink");
      const React = await import("react");
      const { Context } = await import("../../context/context.js");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const { useLocalServer } = await import("../local/server.js");
      const path = await import("path");
      const fs = await import("fs/promises");
      const crypto = await import("crypto");
      const { printDeploymentResults } = await import("../ui/deploy.js");
      const { useFunctions } = await import("../../constructs/Function.js");
      const { dim, gray, yellow } = await import("colorette");
      const { SiteEnv } = await import("../../site-env.js");
      const { usePothosBuilder } = await import("./plugins/pothos.js");
      const { useKyselyTypeGenerator } = await import("./plugins/kysely.js");
      const { useRDSWarmer } = await import("./plugins/warmer.js");
      const { useProject } = await import("../../project.js");
      const { useMetadata } = await import("../../stacks/metadata.js");

      if (args._[0] === "start") {
        console.log(
          yellow(
            `Warning: ${bold(`sst start`)} has been renamed to ${bold(
              `sst dev`
            )}`
          )
        );
      }

      const useFunctionLogger = Context.memo(async () => {
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
              useFunctions().fromID(evt.properties.functionID).handler!
            )
          );
        });

        bus.subscribe("worker.stdout", async (evt) => {
          prefix(evt.properties.requestID);
          const { started } = pending.get(evt.properties.requestID)!;
          for (let line of evt.properties.message.split("\n")) {
            Colors.line(
              prefix(evt.properties.requestID),
              Colors.dim(("+" + (Date.now() - started) + "ms").padEnd(7)),
              Colors.dim(line)
            );
          }
        });

        bus.subscribe("function.build.success", async (evt) => {
          Colors.line(
            Colors.dim(
              Colors.prefix,
              "Built",
              useFunctions().fromID(evt.properties.functionID).handler!
            )
          );
        });

        bus.subscribe("function.build.failed", async (evt) => {
          Colors.gap();
          Colors.line(
            Colors.danger("✖ "),
            "Build failed",
            useFunctions().fromID(evt.properties.functionID).handler!
          );
          for (const line of evt.properties.errors) {
            Colors.line("  ", line);
          }
          Colors.gap();
        });

        bus.subscribe("function.success", async (evt) => {
          // stdout logs sometimes come in after
          const req = pending.get(evt.properties.requestID)!;
          setTimeout(() => {
            Colors.line(
              prefix(evt.properties.requestID),
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
              Colors.line("  ", `${dim(line)}`);
            }
            end(evt.properties.requestID);
          }, 100);
        });
      });

      const useStackBuilder = Context.memo(async () => {
        const watcher = useWatcher();
        const project = useProject();
        const bus = useBus();

        let lastDeployed: string;
        let pending: CloudAssembly | undefined;
        let isDeploying = false;

        async function build() {
          Colors.gap();
          const spinner = createSpinner({
            color: "gray",
            text: lastDeployed ? ` Building...` : dim(` Checking for changes`),
          }).start();
          try {
            const [metafile, sstConfig] = await Stacks.load(
              project.paths.config
            );
            project.metafile = metafile;
            project.stacks = sstConfig.stacks;
            const assembly = await Stacks.synth({
              increaseTimeout: args["increase-timeout"],
              fn: project.stacks,
              outDir: `.sst/cdk.out`,
              mode: "dev",
            });

            Logger.debug("Directory", assembly.directory);
            const next = await checksum(assembly.directory);
            Logger.debug("Checksum", "next", next, "old", lastDeployed);
            if (next === lastDeployed) {
              spinner.succeed(Colors.dim(" Built with no changes"));
              return;
            }
            if (!lastDeployed) {
              spinner.stop();
              spinner.clear();
              Colors.mode("gap");
            } else {
              spinner.succeed(Colors.dim(` Built`));
              Colors.mode("gap");
            }
            pending = assembly;
            if (lastDeployed) setTimeout(() => deploy(), 100);
          } catch (ex: any) {
            spinner.fail();
            Colors.line(
              ex.stack
                .split("\n")
                .map((line: any) => "   " + line)
                .join("\n")
            );
            Colors.gap();
          }
        }

        async function deploy() {
          if (!pending) return;
          if (isDeploying) return;
          isDeploying = true;
          const assembly = pending;
          const nextChecksum = await checksum(assembly.directory);
          pending = undefined;

          if (lastDeployed) console.log();
          const component = render(<DeploymentUI assembly={assembly} />);
          const results = await Stacks.deployMany(assembly.stacks);
          component.clear();
          component.unmount();
          lastDeployed = nextChecksum;
          printDeploymentResults(assembly, results);

          const keys = await SiteEnv.keys();
          if (keys.length) {
            const result: Record<string, Record<string, string>> = {};
            for (const key of keys) {
              const stack = results[key.stack];
              const value = stack.outputs[key.output];
              let existing = result[key.path];
              if (!existing) {
                result[key.path] = existing;
                existing = result[key.path] = {};
              }
              existing[key.environment] = value;
            }
            await SiteEnv.writeValues(result);
          }

          isDeploying = false;
          deploy();
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
                  cdkManifest.artifacts[key].type === "aws:cloudformation:stack"
              )
              .map(async (key: string) => {
                const { templateFile } = cdkManifest.artifacts[key].properties;
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
          if (!project.metafile.inputs[evt.properties.relative]) return;
          build();
        });

        await build();
        await deploy();
      });

      const project = useProject();

      const primary = chalk.hex("#E27152");
      const link = chalk.cyan;
      await useLocalServer({
        key: "",
        cert: "",
        live: true,
      });

      console.clear();
      await printHeader({ console: true, hint: "ready!" });
      /*
      console.log(`  ${primary(`➜`)}  ${bold(dim(`Outputs:`))}`);
      for (let i = 0; i < 3; i++) {
        console.log(`       ${dim(`thdxr-scratch-MyStack`)}`);
        console.log(
          `       ${bold(
            dim(`ApiEndpoint`)
          )}: https://hdq3z0es2d.execute-api.us-east-1.amazonaws.com`
        );
      }
      */

      await Promise.all([
        useRuntimeWorkers(),
        useIOTBridge(),
        useRuntimeServer(),
        usePothosBuilder(),
        useMetadata(),
        useKyselyTypeGenerator(),
        useRDSWarmer(),
        useFunctionLogger(),
        useStackBuilder(),
      ]);
    }
  );
