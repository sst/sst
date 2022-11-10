import React from "react";
import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { blue, bold } from "colorette";
import { useProject } from "../../app.js";
import { Stacks } from "../../stacks/index.js";
import { Program } from "../program.js";
import { render } from "ink";
import { DeploymentUI } from "../ui/deploy.js";

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
          mode: "deploy",
        });
      })();

      const project = useProject();
      console.log(
        `Deploying ${bold(assembly.stacks.length + " stacks")} for stage ${blue(
          project.stage
        )}...`
      );
      process.stdout.write("\x1b[?1049h");
      const component = render(
        <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
      );
      const results = await Stacks.deployMany(assembly.stacks);
      component.unmount();
      process.stdout.write("\x1b[?1049l");

      process.exit(0);
    }
  );
