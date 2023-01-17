import type { Program } from "../program.js";

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
        .option("fullscreen", {
          type: "boolean",
          describe: "Disable full screen UI",
          default: true,
        })
        .positional("filter", {
          type: "string",
          describe: "Optionally filter stacks to deploy",
        }),
    async (args) => {
      const React = await import("react");
      const { printDeploymentResults } = await import("../ui/deploy.js");
      const { createSpinner } = await import("../spinner.js");
      const { blue, bold } = await import("colorette");
      const { useProject } = await import("../../project.js");
      const { loadAssembly, Stacks } = await import("../../stacks/index.js");
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const project = useProject();

      // Generate cloud assembly
      // - if --from is specified, we will use the existing cloud assembly
      // - if --from is not specified, we will call synth to generate
      const assembly = await (async function () {
        if (args.from) {
          const result = await loadAssembly(args.from);
          return result;
        }

        const spinner = createSpinner("Building stacks");
        const result = await Stacks.synth({
          fn: project.stacks,
          mode: "deploy",
        });
        spinner.succeed();
        return result;
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
      console.log(
        `Deploying ${bold(target.length + " stacks")} for stage ${blue(
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

        const spinner = createSpinner("Deploying stacks");
        return () => spinner.succeed();
      })();
      const results = await Stacks.deployMany(target);
      cleanup();
      printDeploymentResults(results);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);
      process.exit(0);
    }
  );
