export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: ["@thundra/esbuild-plugin"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
  },
});
