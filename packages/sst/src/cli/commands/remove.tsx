import { Instance } from "ink";
import type { Program } from "../program.js";
import { createSpinner } from "../spinner.js";
import { printDeploymentResults } from "../ui/deploy.js";

export const remove = (program: Program) =>
  program.command(
    "remove [filter]",
    "Remove all stacks for this app",
    (yargs) =>
      yargs
        .option("from", { type: "string" })
        .option("fullscreen", {
          type: "boolean",
          describe: "Disable full screen UI",
          default: true,
        })
        .positional("filter", { type: "string" }),
    async (args) => {
      const React = await import("react");
      const { CloudAssembly } = await import("aws-cdk-lib/cx-api");
      const { blue, bold } = await import("colorette");
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");

      const assembly = await (async function () {
        if (args.from) {
          const result = new CloudAssembly(args.from);
          return result;
        }

        const project = useProject();
        return await Stacks.synth({
          fn: project.stacks,
          mode: "remove",
        });
      })();

      const project = useProject();
      const target = assembly.stacks.filter(
        (s) =>
          !args.filter ||
          s.stackName.toLowerCase().includes(args.filter.toLowerCase())
      );
      if (!target.length) {
        console.log(`No stacks found matching ${blue(args.filter!)}`);
        process.exit(1);
      }
      console.log(
        `Removing ${bold(target.length + " stacks")} for stage ${blue(
          project.config.stage
        )}...`
      );
      const cleanup = (() => {
        if (args.fullscreen) {
          process.stdout.write("\x1b[?1049h");
          const component = render(
            <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
          );
          return () => {
            component.unmount();
            process.stdout.write("\x1b[?1049l");
          };
        }

        const spinner = createSpinner("Removing stacks");
        return () => spinner.succeed();
      })();
      const results = await Stacks.removeMany(target);
      cleanup();
      printDeploymentResults(results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      process.exit(0);
    }
  );
