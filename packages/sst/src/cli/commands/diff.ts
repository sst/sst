import { useProject } from "../../project.js";
import { Stacks } from "../../stacks/index.js";
import type { Program } from "../program.js";
import { printStackDiff } from "aws-cdk/lib/diff.js";
import { useAWSClient } from "../../credentials.js";
import {
  CloudFormationClient,
  GetTemplateCommand,
} from "@aws-sdk/client-cloudformation";
import { createSpinner } from "../spinner.js";

export const diff = (program: Program) =>
  program.command(
    "diff",
    "",
    (yargs) =>
      yargs.option("mode", {
        type: "string",
        describe: "deploy or dev",
        default: "deploy",
      }),
    async (args) => {
      const spinner = createSpinner("Building stacks");
      const project = useProject();
      const assembly = await Stacks.synth({
        fn: project.stacks,
        mode: args.mode as any,
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
