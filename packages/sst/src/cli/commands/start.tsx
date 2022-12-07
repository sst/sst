import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import type { Program } from "../program.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import type { Metafile } from "esbuild";
import { printDeploymentResults } from "../ui/deploy.js";
import { useFunctions } from "../../constructs/Function.js";
import { dim, gray, yellow } from "colorette";
import { useProject } from "../../app.js";
import { SiteEnv } from "../../site-env.js";
import { Instance } from "ink/build/render.js";
import { ApiMetadata } from "../../constructs/Metadata.js";
import { Pothos } from "../../pothos.js";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

export const start = (program: Program) =>
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
        const project = useProject();

        let lastDeployed: string;
        let pending: CloudAssembly | undefined;
        let isDeploying = false;

        async function build() {
          const spinner = createSpinner("Building stacks").start();
          try {
            const fn = await Stacks.build();
            const assembly = await Stacks.synth({
              fn,
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

      const usePothosBuilder = Context.memo(() => {
        let routes: Extract<
          ApiMetadata["data"]["routes"][number],
          { type: "graphql" | "pothos" }
        >[] = [];
        const bus = useBus();

        async function build(route: any) {
          try {
            const schema = await Pothos.generate({
              schema: route.schema,
            });
            await fs.writeFile(route.output, schema);
            // bus.publish("pothos.extracted", { file: route.output });
            await Promise.all(
              route.commands.map((cmd: string) => execAsync(cmd))
            );
            console.log("Done building pothos schema");
          } catch (ex) {
            console.error("Failed to extract schema from pothos");
            console.error(ex);
          }
        }

        bus.subscribe("file.changed", async (evt) => {
          if (evt.properties.file.endsWith("out.mjs")) return;
          for (const route of routes) {
            const dir = path.dirname(route.schema!);
            const relative = path.relative(dir, evt.properties.file);
            if (
              relative &&
              !relative.startsWith("..") &&
              !path.isAbsolute(relative)
            )
              build(route);
          }
        });

        let first = false;
        bus.subscribe("stacks.metadata", async (evt) => {
          routes = Object.values(evt.properties)
            .flat()
            .filter((c): c is ApiMetadata => c.type == "Api")
            .flatMap((c) => c.data.routes)
            .filter((r) => ["pothos", "graphql"].includes(r.type))
            .filter((r) => r.schema) as typeof routes;
          if (first) return;
          for (const route of routes) {
            build(route);
            first = true;
          }
        });
      });

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
        useMetadata(),
        usePothosBuilder(),
        useFunctionLogger(),
        useStackBuilder(),
      ]);
    }
  );
