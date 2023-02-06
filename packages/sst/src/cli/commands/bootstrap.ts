import type { Program } from "../program.js";

export const bootstrap = (program: Program) =>
  program.command(
    "bootstrap",
    "Create the SST bootstrap stack",
    (yargs) => yargs,
    async () => {
      const { Colors } = await import("../colors.js");
      const { useProject } = await import("../../project.js");
      const { useBootstrap } = await import("../../bootstrap.js");
      const { useSTSIdentity } = await import("../../credentials.js");
      const project = useProject();
      const identity = await useSTSIdentity();
      await useBootstrap();
      Colors.line(
        Colors.success(`✔`),
        Colors.bold(
          ` Bootstrapped account ${identity.Account} in region ${project.config.region}`
        )
      );
      process.exit(0);
    }
  );
