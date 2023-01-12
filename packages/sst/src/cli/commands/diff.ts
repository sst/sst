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
      const { printStackDiff } = await import("aws-cdk/lib/diff.js");
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { useAWSClient } = await import("../../credentials.js");
      const { CloudFormationClient, GetTemplateCommand } = await import(
        "@aws-sdk/client-cloudformation"
      );
      const { createSpinner } = await import("../spinner.js");

      const spinner = createSpinner("Building stacks");
      const project = useProject();
      const assembly = await Stacks.synth({
        fn: project.stacks,
        mode: args.dev ? "dev" : "deploy",
      });
      spinner.succeed();
      const cfn = useAWSClient(CloudFormationClient);
      for (const stack of assembly.stacks) {
        const response = await cfn.send(
          new GetTemplateCommand({
            StackName: stack.stackName,
          })
        );
        printStackDiff(
          JSON.parse(response.TemplateBody!),
          stack as any,
          true,
          3
        );
      }
      process.exit(0);
    }
  );
