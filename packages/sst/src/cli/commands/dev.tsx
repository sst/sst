import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import type { Program } from "../program.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import type { Metafile } from "esbuild";
import { printDeploymentResults } from "../ui/deploy.js";
import { useFunctions } from "../../constructs/Function.js";
import { dim, gray, yellow } from "colorette";
import { SiteEnv } from "../../site-env.js";
import { Instance } from "ink/build/render.js";
import { usePothosBuilder } from "./plugins/pothos.js";
import { useKyselyTypeGenerator } from "./plugins/kysely.js";
import { useRDSWarmer } from "./plugins/warmer.js";
import { useProject } from "../../project.js";
import { useMetadata } from "../../stacks/metadata.js";

export const dev = (program: Program) =>
  program.command(
    ["start", "dev"],
    "Work on your SST app locally",
    (yargs) =>
      yargs.option("fullscreen", {
        type: "boolean",
        describe: "Disable full screen UI",
        default: true,
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

        bus.subscribe("function.invoked", async (evt) => {
          console.log(
            bold(magenta(`Invoked `)),
            useFunctions().fromID(evt.properties.functionID).handler!
          );
        });

        bus.subscribe("function.build.success", async (evt) => {
          console.log(
            bold(gray(`Built   `)),
            useFunctions().fromID(evt.properties.functionID).handler!
          );
        });
        bus.subscribe("function.build.failed", async (evt) => {
          console.log(
            bold(red(`Build failed `)),
            useFunctions().fromID(evt.properties.functionID).handler!
          );
          console.log(dim(evt.properties.errors.join("\n")));
        });

        bus.subscribe("worker.stdout", async (evt) => {
          const { message } = evt.properties;
          const lines = message.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            lines[i] = "         " + line;
          }
          console.log(
            bold(blue(`Log     `)),
            useFunctions().fromID(evt.properties.functionID).handler!
          );
          console.log(dim(lines.join("\n")));
        });

        bus.subscribe("function.success", async (evt) => {
          console.log(
            bold(green(`Success `)),
            useFunctions().fromID(evt.properties.functionID).handler!
          );
        });

        bus.subscribe("function.error", async (evt) => {
          console.log(
            bold(red(`Error   `)),
            useFunctions().fromID(evt.properties.functionID).handler!,
            evt.properties.errorMessage
          );
          for (const line of evt.properties.trace || []) {
            console.log(`         ${dim(line)}`);
          }
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
          const spinner = createSpinner("Building stacks").start();
          try {
            const [metafile, sstConfig] = await Stacks.load(
              project.paths.config
            );
            project.metafile = metafile;
            project.stacks = sstConfig.stacks;
            const assembly = await Stacks.synth({
              fn: project.stacks,
              outDir: `.sst/cdk.out`,
              mode: "dev",
            });
            Logger.debug("Directory", assembly.directory);
            const next = await checksum(assembly.directory);
            Logger.debug("Checksum", "next", next, "old", lastDeployed);
            if (next === lastDeployed) {
              spinner.succeed("Stacks built! No changes");
              return;
            }
            spinner.succeed(lastDeployed ? `Stacks built!` : `Stacks built!`);
            pending = assembly;
            if (lastDeployed) deploy();
          } catch (ex) {
            spinner.fail();
            console.error(ex);
          }
        }

        async function deploy() {
          if (!pending) return;
          if (isDeploying) return;
          isDeploying = true;
          const assembly = pending;
          const nextChecksum = await checksum(assembly.directory);
          pending = undefined;
          let component: Instance | undefined = undefined;
          if (args.fullscreen) {
            process.stdout.write("\x1b[?1049h");
            component = render(
              <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
            );
          }
          const results = await Stacks.deployMany(assembly.stacks);
          if (component) component.unmount();
          process.stdout.write("\x1b[?1049l");
          lastDeployed = nextChecksum;
          printDeploymentResults(results);

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

      createSpinner("").start().succeed("Ready for function invocations");
      createSpinner("")
        .start()
        .succeed(`Console ready at https://console.sst.dev`);

      await Promise.all([
        useLocalServer({
          key: "",
          cert: "",
          live: true,
          port: 13557,
        }),
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
