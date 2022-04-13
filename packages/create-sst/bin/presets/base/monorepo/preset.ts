import { basename } from "path";

export default definePreset({
  name: "Base: Monorepo",
  handler: async (ctx) => {
    await extractTemplates({});
    await editFiles({
      files: ["**"],
      operations: [
        {
          type: "replace-variables",
          variables: {
            app: basename(ctx.applyOptions.targetDirectory),
          },
        },
      ],
    });
    await editFiles({
      files: ["package.json"],
      operations: [
        {
          type: "edit-json",
          merge: {
            workspaces: ["backend"],
          },
        },
      ],
    });
    await installPackages({});
    await installPackages({
      packages: ["aws-sdk"],
      additionalArgs: ["-w", "backend"],
    });
    await installPackages({
      packages: ["@types/aws-lambda"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
  },
});
