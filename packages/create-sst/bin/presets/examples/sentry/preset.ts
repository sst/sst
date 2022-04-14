export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: "@sentry/serverless",
      additionalArgs: ["-w", "backend"],
    });
  },
});
