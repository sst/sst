import { Colors } from "../colors.js";
import type { Program } from "../program.js";
import { printHeader } from "../ui/header.js";

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
      const { loadAssembly, Stacks } = await import("../../stacks/index.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const project = useProject();

      printHeader({});

      // Generate cloud assembly
      // - if --from is specified, we will use the existing cloud assembly
      // - if --from is not specified, we will call synth to generate
      const assembly = await (async function () {
        if (args.from) {
          const result = await loadAssembly(args.from);
          return result;
        }

        const spinner = createSpinner({
          text: " Building stacks",
        });
        const result = await Stacks.synth({
          fn: project.stacks,
          mode: "deploy",
        });
        spinner.succeed();
        console.log();
        return result;
      })();

      const target = assembly.stacks.filter(
        (s) =>
          !args.filter ||
          s.stackName.toLowerCase().includes(args.filter.toLowerCase())
      );
      if (!target.length) {
        Colors.line(`No stacks found matching ${blue(args.filter!)}`);
        process.exit(1);
      }
      const component = render(
        <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
      );
      const results = await Stacks.deployMany(assembly.stacks);
      component.clear();
      component.unmount();
      printDeploymentResults(assembly, results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      process.exit(0);
    }
  );
