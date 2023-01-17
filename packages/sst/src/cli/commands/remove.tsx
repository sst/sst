import type { Program } from "../program.js";

export const remove = (program: Program) =>
  program.command(
    "remove [filter]",
    "Remove your app from AWS",
    (yargs) =>
      yargs
        .option("from", { type: "string" })
        .option("fullscreen", {
          type: "boolean",
          describe: "Disable full screen UI",
          default: true,
        })
        .positional("filter", {
          type: "string",
          describe: "Optionally filter stacks to remove",
        }),
    async (args) => {
      const React = await import("react");
      const { CloudAssembly } = await import("aws-cdk-lib/cx-api");
      const { dim, blue, bold } = await import("colorette");
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const { printDeploymentResults } = await import("../ui/deploy.js");
      const { Colors } = await import("../colors.js");

      const project = useProject();

      console.log();
      console.log(`  ${Colors.primary(`${bold(`SST`)} v${project.version}`)}`);
      console.log();
      console.log(
        `  ${Colors.primary(`➜`)}  ${bold(`Stage:`)}   ${dim(
          project.config.stage
        )}`
      );
      console.log();

      const assembly = await (async function () {
        if (args.from) {
          const result = new CloudAssembly(args.from);
          return result;
        }

        return await Stacks.synth({
          fn: project.stacks,
          mode: "remove",
        });
      })();

      const target = assembly.stacks.filter(
        (s) =>
          !args.filter ||
          s.stackName.toLowerCase().includes(args.filter.toLowerCase())
      );
      if (!target.length) {
        console.log(`No stacks found matching ${blue(args.filter!)}`);
        process.exit(1);
      }
      const component = render(
        <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
      );
      const results = await Stacks.removeMany(target);
      component.clear();
      component.unmount();
      printDeploymentResults(assembly, results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      process.exit(0);
    }
  );
