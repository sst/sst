import { basename } from "path";

export default definePreset({
  name: "Base: Javascript",
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
    await installPackages({
      for: "node",
      packages: [
        "@serverless-stack/cli@1.0.0-beta.9",
        "@serverless-stack/resources@1.0.0-beta.9",
      ],
      packageManager: "npm",
      dev: true,
    });
  },
});
