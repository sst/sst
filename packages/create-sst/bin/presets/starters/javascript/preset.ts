export default definePreset({
  name: "Starter: JS",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/javascript",
    });
    await applyNestedPreset({
      preset: "presets/base/monorepo",
    });
    await extractTemplates();
  },
});
