import { useSTSIdentity } from "../../credentials.js";
import { Colors } from "../colors.js";
import type { Program } from "../program.js";
import fs from "fs/promises";
import path from "path";

export const deploy = (program: Program) =>
  program.command(
    "deploy [filter]",
    "Deploy your app to AWS",
    (yargs) =>
      yargs
        .option("from", {
          type: "string",
          describe: "Deploy using previously built output",
        })
        .positional("filter", {
          type: "string",
          describe: "Optionally filter stacks to deploy",
        }),
    async (args) => {
      const React = await import("react");
      const { printDeploymentResults } = await import("../ui/deploy.js");
      const { createSpinner } = await import("../spinner.js");
      const { dim, blue, bold } = await import("colorette");
      const { useProject } = await import("../../project.js");
      const { loadAssembly, useAppMetadata, saveAppMetadata, Stacks } =
        await import("../../stacks/index.js");
      const { getCiInfo } = await import("../ci-info.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const { mapValues } = await import("remeda");
      const project = useProject();
      const [identity, appMetadata] = await Promise.all([
        useSTSIdentity(),
        useAppMetadata(),
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
            `You were previously running the stage "${project.config.stage}" in dev mode. It is recommended that you use a different stage for production. Read more here — https://docs.sst.dev/live-lambda-development\n\nAre you sure you want to deploy to this stage? (y/N) `,
            async (input) => {
              rl.close();
              resolve(input.trim() === "y");
            }
          );
        });
      }

      // Check app mode changed
      if (!getCiInfo().isCI && appMetadata && appMetadata.mode !== "deploy") {
        if (!(await promptChangeMode())) {
          process.exit(0);
        }
      }

      Colors.line(`${Colors.primary.bold(`SST v${project.version}`)}`);
      Colors.gap();
      Colors.line(
        `${Colors.primary(`➜`)}  ${Colors.bold("App:")}     ${
          project.config.name
        }`
      );
      Colors.line(`   ${Colors.bold("Stage:")}   ${project.config.stage}`);
      Colors.line(`   ${Colors.bold("Region:")}  ${project.config.region}`);
      Colors.line(`   ${Colors.bold("Account:")} ${identity.Account}`);
      Colors.gap();

      const isActiveStack = (stackId: string) =>
        !args.filter ||
        stackId
          .toLowerCase()
          .replace(project.config.name.toLowerCase(), "")
          .replace(project.config.stage.toLowerCase(), "")
          .includes(args.filter.toLowerCase());

      // Generate cloud assembly
      // - if --from is specified, we will use the existing cloud assembly
      // - if --from is not specified, we will call synth to generate
      const assembly = await (async function () {
        if (args.from) {
          const result = await loadAssembly(args.from);
          return result;
        }

        const spinner = createSpinner({
          text: " Building...",
        });
        const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
        const result = await Stacks.synth({
          fn: sstConfig.stacks,
          mode: "deploy",
          isActiveStack,
        });
        spinner.succeed();
        return result;
      })();

      const target = assembly.stacks.filter((s) => isActiveStack(s.id));
      if (!target.length) {
        Colors.line(`No stacks found matching ${blue(args.filter!)}`);
        process.exit(1);
      }
      const component = render(<DeploymentUI assembly={assembly} />);
      const results = await Stacks.deployMany(target);
      component.clear();
      component.unmount();
      printDeploymentResults(assembly, results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      fs.writeFile(
        path.join(project.paths.out, "outputs.json"),
        JSON.stringify(
          mapValues(results, (val) => val.outputs),
          null,
          2
        )
      );

      // Update app state
      await saveAppMetadata({ mode: "deploy" });

      process.exit(0);
    }
  );
