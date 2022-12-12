import type { Program } from "../program.js";
import { printDeploymentResults } from "../ui/deploy.js";

export const remove = (program: Program) =>
  program.command(
    "remove [filter]",
    "Remove all stacks for this app",
    (yargs) =>
      yargs
        .option("from", { type: "string" })
        .positional("filter", { type: "string" }),
    async (args) => {
      const React = await import("react");
      const { CloudAssembly } = await import("aws-cdk-lib/cx-api");
      const { blue, bold } = await import("colorette");
      const { useProject } = await import("../../app.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");

      const assembly = await (async function () {
        if (args.from) {
          const result = new CloudAssembly(args.from);
          return result;
        }

        const fn = await Stacks.build();
        return await Stacks.synth({
          fn,
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
        return;
      }
      console.log(
        `Removing ${bold(target.length + " stacks")} for stage ${blue(
          project.stage
        )}...`
      );
      process.stdout.write("\x1b[?1049h");
      const component = render(
        <DeploymentUI stacks={target.map((s) => s.stackName)} />
      );
      const results = await Stacks.removeMany(target);
      component.unmount();
      process.stdout.write("\x1b[?1049l");
      printDeploymentResults(results);
      process.exit(0);
    }
  );
