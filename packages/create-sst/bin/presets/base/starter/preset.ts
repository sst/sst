export default definePreset({
  name: "Starter",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/typescript",
    });
    await extractTemplates();
    await installPackages({
      dev: true,
      packages: ["vitest"],
    });
    await editFiles({
      files: ["package.json"],
      operations: [
        {
          type: "edit-json",
          merge: {
            scripts: {
              test: "vitest run",
            },
          },
        },
      ],
    });
  },
});
