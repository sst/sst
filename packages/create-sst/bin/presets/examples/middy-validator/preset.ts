export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: [
        "@middy/core",
        "@middy/http-error-handler",
        "@middy/http-json-body-parser",
        "@middy/validator",
      ],
      additionalArgs: ["-w", "backend"],
    });
  },
});
