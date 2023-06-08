import type { Program } from "../program.js";
import { stackNameToId } from "../ui/stack.js";

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
      const { Colors } = await import("../colors.js");

      // Build app
      const project = useProject();
      const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
      const assembly = await Stacks.synth({
        fn: sstConfig.stacks,
        mode: args.dev ? "dev" : "deploy",
      });

      // Diff each stack
      let changesAcc = 0;
      let changedStacks = 0;
      const cfn = useAWSClient(CloudFormationClient);
      for (const stack of assembly.stacks) {
        const spinner = createSpinner(
          `${stack.stackName}: Checking for changes...`
        );

        // get old template
        const oldTemplate = await getTemplate(stack.stackName);
        if (!oldTemplate) {
          spinner.clear();
          Colors.line(
            `➜  ${Colors.dim.bold(
              stackNameToId(stack.stackName) + ":"
            )} New stack`
          );
          Colors.gap();
          continue;
        }

        // generate diff
        const { count, diff } = await Stacks.diff(stack, oldTemplate);
        spinner.clear();

        // print diff result
        if (count === 0) {
          Colors.line(
            `➜  ${Colors.dim.bold(
              stackNameToId(stack.stackName) + ":"
            )} No changes`
          );
          Colors.gap();
        } else if (count === 1) {
          Colors.line(
            `➜  ${Colors.dim.bold(
              stackNameToId(stack.stackName) + ":"
            )} ${count} change`
          );
          Colors.gap();
          console.log(diff);
          changesAcc += count;
          changedStacks++;
        } else {
          Colors.line(
            `➜  ${Colors.dim.bold(
              stackNameToId(stack.stackName) + ":"
            )} ${count} changes`
          );
          Colors.gap();
          console.log(diff);
          changesAcc += count;
          changedStacks++;
        }
      }

      // Handle no changes
      if (changedStacks === 0) {
        Colors.line(Colors.success(`✔`), Colors.bold(" Diff:"), "No changes");
      } else {
        Colors.line(
          Colors.success(`✔`),
          Colors.bold(" Diff:"),
          changesAcc === 1 ? "1 change found in" : `${changesAcc} changes in`,
          changedStacks === 1 ? "1 stack" : `${changedStacks} stacks`
        );
      }

      process.exit(0);

      async function getTemplate(stackName: string) {
        try {
          const response = await cfn.send(
            new GetTemplateCommand({ StackName: stackName })
          );
          return JSON.parse(response.TemplateBody!);
        } catch (e: any) {
          if (
            e.name === "ValidationError" &&
            e.message.includes("does not exist")
          ) {
            return;
          }
          throw e;
        }
      }
    }
  );
