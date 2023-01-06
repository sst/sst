import type { Program } from "../program.js";
import { printDeploymentResults } from "../ui/deploy.js";
import { Instance } from "ink/build/render.js";

export const deploy = (program: Program) =>
  program.command(
    "deploy [filter]",
    "Work on your SST app locally",
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
      const project = useProject();
      const assembly = await (async function () {
        if (args.from) {
          const result = new CloudAssembly(args.from);
          return result;
        }

        return await Stacks.synth({
          fn: project.stacks,
          mode: "deploy",
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
        return;
      }
      console.log(
        `Deploying ${bold(target.length + " stacks")} for stage ${blue(
          project.config.stage
        )}...`
      );
      let component: Instance | undefined = undefined;
      if (args.fullscreen) {
        process.stdout.write("\x1b[?1049h");
        component = render(
          <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
        );
      }
      const results = await Stacks.deployMany(target);
      if (component) component.unmount();
      process.stdout.write("\x1b[?1049l");
      printDeploymentResults(results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      process.exit(0);
    }
  );
