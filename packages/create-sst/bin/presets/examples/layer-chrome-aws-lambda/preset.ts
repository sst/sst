export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: ["chrome-aws-lambda", "puppeteer", "puppeteer-core"],
      additionalArgs: ["-w", "backend"],
    });
  },
});
