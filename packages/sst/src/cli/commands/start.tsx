import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import type { Program } from "../program.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import type { Metafile } from "esbuild";

export const start = (program: Program) =>
  program.command(
    "start",
    "Work on your SST app locally",
    yargs => yargs,
    async () => {
      const { useRuntimeWorkers } = await import("../../runtime/workers.js");
      const { useIOTBridge } = await import("../../runtime/iot.js");
      const { useRuntimeServer } = await import("../../runtime/server.js");
      const { useMetadata } = await import("../../stacks/metadata.js");
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

      const useFunctionLogger = Context.memo(async () => {
        const bus = useBus();
      
        bus.subscribe("function.invoked", async evt => {
          console.log(bold(magenta(`Invoked `)), bold(evt.properties.functionID));
        });
      
        bus.subscribe("worker.stdout", async evt => {
          console.log(
            bold(blue(`Log     `)),
            bold(evt.properties.functionID),
            evt.properties.message
          );
        });
      
        bus.subscribe("function.success", async evt => {
          console.log(bold(green(`Success `)), bold(evt.properties.functionID));
        });
      });
      
      const useStackBuilder = Context.memo(async () => {
        const watcher = useWatcher();
        const bus = useBus();
      
        let lastDeployed: string;
        let pending: CloudAssembly | undefined;
        let isDeploying = false;
      
        async function build() {
          const spinner = createSpinner("Building stacks").start();
          const fn = await Stacks.build();
          const assembly = await Stacks.synth({
            fn,
            outDir: `.sst/cdk.out`,
            mode: "start"
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
        }
      
        async function deploy() {
          if (!pending) return;
          if (isDeploying) return;
          isDeploying = true;
          const assembly = pending;
          const nextChecksum = await checksum(assembly.directory);
          pending = undefined;
          process.stdout.write("\x1b[?1049h");
          const component = render(
            <DeploymentUI stacks={assembly.stacks.map(s => s.stackName)} />
          );
          const results = await Stacks.deployMany(assembly.stacks);
          component.unmount();
          process.stdout.write("\x1b[?1049l");
          lastDeployed = nextChecksum;
          console.log(`----------------------------`);
          console.log(`| Stack deployment results |`);
          console.log(`----------------------------`);
          for (const [stack, result] of Object.entries(results)) {
            const icon = (() => {
              if (Stacks.isSuccess(result.status)) return green("✔");
              if (Stacks.isFailed(result.status)) return red("✖");
            })();
            console.log(`${icon} ${stack}`);
            for (const [id, error] of Object.entries(result.errors)) {
              console.log(bold(`  ${id}: ${error}`));
            }
          }
          isDeploying = false;
          deploy();
        }
      
        async function checksum(cdkOutPath: string) {
          const manifestPath = path.join(cdkOutPath, "manifest.json");
          const cdkManifest = JSON.parse(
            await fs.readFile(manifestPath).then(x => x.toString())
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
          ).then(x => x.join("\n"));
          const hash = crypto
            .createHash("sha256")
            .update(checksumData)
            .digest("hex");
          return hash;
        }
      
        let metafile: Metafile;
        bus.subscribe("stack.built", async evt => {
          metafile = evt.properties.metafile;
        });
      
        watcher.subscribe("file.changed", async evt => {
          if (!metafile) return;
          if (!metafile.inputs[evt.properties.relative]) return;
          build();
        });
      
        await build();
        await deploy();
      });

      createSpinner("")
        .start()
        .succeed("Ready for function invocations");
      await Promise.all([
        useRuntimeWorkers(),
        useIOTBridge(),
        useRuntimeServer(),
        useMetadata(),
        useFunctionLogger()
      ]);
      await useStackBuilder();
    }
  );

