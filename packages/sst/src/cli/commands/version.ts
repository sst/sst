import type { Program } from "../program.js";

export const version = (program: Program) =>
  program.command(
    "version",
    "Print SST and CDK version",
    (yargs) => yargs,
    async (args) => {
      const { Colors } = await import("../colors.js");
      const { useProject } = await import("../../project.js");
      const project = useProject();
      Colors.line(Colors.bold(`SST:`), `v${project.version}`);
      Colors.line(Colors.bold(`CDK:`), `v${project.cdkVersion}`);
      Colors.line(Colors.bold(`Constructs:`), `v${project.constructsVersion}`);
    }
  );
