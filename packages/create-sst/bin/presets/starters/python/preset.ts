export default definePreset({
  name: "Starter: Typescript",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/typescript",
    });
    await applyNestedPreset({
      preset: "presets/base/monorepo",
    });
    await extractTemplates();
    await installPackages({
      packages: ["@types/node", "@types/aws-lambda"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
    await editFiles({
      files: ["backend/package.json"],
      operations: [
        {
          type: "edit-json",
          merge: {
            scripts: {
              typecheck: "tsc --noEmit",
              test: "vitest",
            },
          },
        },
      ],
    });
  },
});
