import type { Program } from "../program.js";

export const bootstrap = (program: Program) =>
  program.command(
    "bootstrap",
    "Create the SST bootstrap stack",
    (yargs) =>
      yargs
        .option("tags", {
          type: "array",
          string: true,
          describe: "Tags to add for the bootstrap stack",
        })
        .option("public-access-block-configuration", {
          type: "boolean",
          default: true,
          describe: "Block public access configuration on SST bootstrap bucket",
        }),
    async (args) => {
      const { createSpinner } = await import("../spinner.js");
      const { Colors } = await import("../colors.js");
      const { useProject } = await import("../../project.js");
      const { bootstrapSST } = await import("../../bootstrap.js");
      const { useSTSIdentity } = await import("../../credentials.js");
      const project = useProject();
      const identity = await useSTSIdentity();
      const tags = Object.fromEntries(
        args.tags?.map((t) => t.split("=")) || []
      );
      if (args.tags?.length) {
        Colors.line(`${Colors.primary(`➜`)}  Using tags`, tags);
      }
      const spinner = createSpinner(" Deploying bootstrap stack").start();
      await bootstrapSST(tags, args.publicAccessBlockConfiguration);
      spinner.succeed(
        Colors.bold(
          ` Bootstrapped account ${identity.Account} in region ${project.config.region}`
        )
      );
      process.exit(0);
    }
  );
