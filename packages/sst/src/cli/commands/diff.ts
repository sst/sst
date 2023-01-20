import type { Program } from "../program.js";

export const diff = (program: Program) =>
  program.command(
    "diff",
    "Compare your app with what is deployed on AWS",
    (yargs) =>
      yargs.option("dev", {
        type: "boolean",
        describe: "Compare in dev mode",
      }),
    async (args) => {
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { useAWSClient } = await import("../../credentials.js");
      const { CloudFormationClient, GetTemplateCommand } = await import(
        "@aws-sdk/client-cloudformation"
      );
      const { createSpinner } = await import("../spinner.js");
      const { green } = await import("colorette");

      // Build app
      const spinner = createSpinner("Building stacks");
      const project = useProject();
      const assembly = await Stacks.synth({
        fn: project.stacks,
        mode: args.dev ? "dev" : "deploy",
      });
      spinner.succeed();
      console.log("");

      // Diff each stack
      let changesAcc = 0;
      let changedStacks = 0;
      const cfn = useAWSClient(CloudFormationClient);
      for (const stack of assembly.stacks) {
        const spinner = createSpinner(`${stack.stackName}: Checking for changes...`);

        // get old template
        const response = await cfn.send(
          new GetTemplateCommand({
            StackName: stack.stackName,
          })
        );
        const oldTemplate = JSON.parse(response.TemplateBody!);

        // generate diff
        const { count, diff } = await Stacks.diff(stack, oldTemplate);

        spinner.clear();

        // print diff result
        if (count === 0) {
          console.log(`➜ ${stack.stackName}: No changes`);
          console.log("");
        }
        else if (count === 1) {
          console.log(`➜ ${stack.stackName}: ${count} change`);
          console.log("");
          console.log(diff);
          changesAcc += count;
          changedStacks++;
        }
        else {
          console.log(`➜ ${stack.stackName}: ${count} changes`);
          console.log("");
          console.log(diff);
          changesAcc += count;
          changedStacks++;
        }
      }

      // Handle no changes
      if (changedStacks === 0) {
        console.log(green("✔"), " There were no changes");
      }
      else {
        console.log(
          green("✔"),
          changesAcc === 1
            ? "1 change found in"
            : `${changesAcc} changes found in`,
          changedStacks === 1
            ? "1 stack"
            : `${changedStacks} stacks`
        );
      }

      process.exit(0);
    }
  );
