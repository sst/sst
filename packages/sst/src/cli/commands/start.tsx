import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import type { Program } from "../program.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import type { Metafile } from "esbuild";
import { printDeploymentResults } from "../ui/deploy.js";
import { useFunctions } from "../../constructs/Function.js";
import { dim, gray } from "colorette";

export const start = (program: Program) =>
  program.command(
    "start",
    "Work on your SST app locally",
    (yargs) => yargs,
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
      const { useLocalServer } = await import("../local/server.js");

      const useFunctionLogger = Context.memo(async () => {
        const bus = useBus();

        bus.subscribe("function.invoked", async (evt) => {
          console.log(
            bold(magenta(`Invoked `)),
            bold(useFunctions().fromID(evt.properties.functionID).handler!)
          );
        });

        bus.subscribe("function.built", async (evt) => {
          console.log(
            bold(gray(`Built   `)),
            bold(useFunctions().fromID(evt.properties.functionID).handler!)
          );
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
            bold(useFunctions().fromID(evt.properties.functionID).handler!)
          );
          console.log(dim(lines.join("\n")));
        });

        bus.subscribe("function.success", async (evt) => {
          console.log(
            bold(green(`Success `)),
            bold(useFunctions().fromID(evt.properties.functionID).handler!)
          );
        });

        bus.subscribe("function.error", async (evt) => {
          console.log(
            bold(red(`Error   `)),
            bold(useFunctions().fromID(evt.properties.functionID).handler!),
            evt.properties.errorMessage
          );
          for (const line of evt.properties.trace) {
            console.log(`         ${dim(line)}`);
          }
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
            mode: "start",
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
            <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
          );
          const results = await Stacks.deployMany(assembly.stacks);
          component.unmount();
          process.stdout.write("\x1b[?1049l");
          lastDeployed = nextChecksum;
          printDeploymentResults(results);
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

        let metafile: Metafile;
        bus.subscribe("stack.built", async (evt) => {
          metafile = evt.properties.metafile;
        });

        watcher.subscribe("file.changed", async (evt) => {
          if (!metafile) return;
          if (!metafile.inputs[evt.properties.relative]) return;
          build();
        });

        await build();
        await deploy();
      });

      createSpinner("").start().succeed("Ready for function invocations");
      const local = await useLocalServer({
        key: "",
        cert: "",
        live: true,
        port: 13557,
      });
      await Promise.all([
        useRuntimeWorkers(),
        useIOTBridge(),
        useRuntimeServer(),
        useMetadata(),
        useFunctionLogger(),
      ]);
      await useStackBuilder();
    }
  );
