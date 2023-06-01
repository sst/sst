import type { Program } from "../program.js";

export const remove = (program: Program) =>
  program.command(
    "remove [filter]",
    "Remove your app from AWS",
    (yargs) =>
      yargs.option("from", { type: "string" }).positional("filter", {
        type: "string",
        describe: "Optionally filter stacks to remove",
      }),
    async (args) => {
      const React = await import("react");
      const { dim, blue, bold } = await import("colorette");
      const { useProject } = await import("../../project.js");
      const { loadAssembly, clearAppMetadata, Stacks } = await import(
        "../../stacks/index.js"
      );
      const { render } = await import("ink");
      const { DeploymentUI } = await import("../ui/deploy.js");
      const { printDeploymentResults } = await import("../ui/deploy.js");
      const { Colors } = await import("../colors.js");
      const { useSTSIdentity } = await import("../../credentials.js");

      const project = useProject();
      const identity = await useSTSIdentity();

      Colors.line(`${Colors.primary.bold(`SST v${project.version}`)}`);
      Colors.gap();
      Colors.line(
        `${Colors.primary(`➜`)}  ${Colors.bold("App:")}     ${
          project.config.name
        }`
      );
      Colors.line(`   ${Colors.bold("Stage:")}   ${project.config.stage}`);
      Colors.line(`   ${Colors.bold("Region:")}  ${project.config.region}`);
      Colors.line(`   ${Colors.bold("Account:")} ${identity.Account}`);

      const assembly = await (async function () {
        if (args.from) {
          const result = await loadAssembly(args.from);
          return result;
        }

        const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
        return await Stacks.synth({
          fn: sstConfig.stacks,
          mode: "remove",
        });
      })();

      const target = assembly.stacks.filter(
        (s) =>
          !args.filter ||
          s.id
            .toLowerCase()
            .replace(project.config.name.toLowerCase(), "")
            .replace(project.config.stage.toLowerCase(), "")
            .includes(args.filter.toLowerCase())
      );
      if (!target.length) {
        console.log(`No stacks found matching ${blue(args.filter!)}`);
        process.exit(1);
      }
      const component = render(
        <DeploymentUI assembly={assembly} remove={true} />
      );
      const results = await Stacks.removeMany(target);
      component.clear();
      component.unmount();
      printDeploymentResults(assembly, results, true);
      if (Object.values(results).some((stack) => Stacks.isFailed(stack.status)))
        process.exit(1);

      await clearAppMetadata();

      process.exit(0);
    }
  );
