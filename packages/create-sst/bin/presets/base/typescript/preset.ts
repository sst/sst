export default definePreset({
  name: "Base: Typescript",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/javascript",
    });
    await extractTemplates({});
    await installPackages({
      for: "node",
      packages: ["typescript", "@tsconfig/node14"],
      packageManager: "npm",
      dev: true,
    });
    await editFiles({
      files: ["sst.json"],
      operations: [{ type: "edit-json", merge: { main: "stacks/index.ts" } }],
    });
    await editFiles({
      files: ["package.json"],
      operations: [
        {
          type: "edit-json",
          merge: {
            scripts: {
              typecheck: "tsc --noEmit",
            },
          },
        },
      ],
    });
  },
});
