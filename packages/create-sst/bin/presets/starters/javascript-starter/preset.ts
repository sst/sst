export default definePreset({
  name: "Starter: JS",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/starter",
    });
    await applyNestedPreset({
      preset: "presets/base/monorepo",
    });
    await extractTemplates();
  },
});
