export default definePreset({
  name: "Example: Cron Job",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/typescript",
    });
    await extractTemplates();
    await installPackages({
      packages: ["node-fetch"],
    });
  },
});
