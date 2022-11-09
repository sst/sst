import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { blue, bold } from "colorette";
import { useProject } from "../../app.js";
import { Stacks } from "../../stacks/index.js";
import { Program } from "../program.js";

export const deploy = (program: Program) =>
  program.command(
    "deploy",
    "Work on your SST app locally",
    (yargs) => yargs.option("from", { type: "string" }),
    async (args) => {
      const assembly = await (async function () {
        if (args.from) {
          const result = new CloudAssembly(args.from);
          return result;
        }

        const fn = await Stacks.build();
        return await Stacks.synth({
          fn,
          mode: "start",
        });
      })();

      const project = useProject();
      console.log(
        `Deploying ${bold(assembly.stacks.length + " stacks")} for stage ${blue(
          project.stage
        )}...`
      );
      await Stacks.deployMany(assembly.stacks);
    }
  );
