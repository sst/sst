export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: ["sharp", "aws-sdk"],
      additionalArgs: ["-w", "backend"],
    });
    await installPackages({
      packages: ["@types/sharp"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
  },
});
