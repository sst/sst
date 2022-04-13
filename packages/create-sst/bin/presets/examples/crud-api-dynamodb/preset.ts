export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: ["uuid", "aws-sdk"],
      additionalArgs: ["-w", "backend"],
    });
    await installPackages({
      packages: ["@types/uuid"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
  },
});
