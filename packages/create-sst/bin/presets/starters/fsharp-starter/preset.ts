export default definePreset({
  name: "Starter: C#",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/starter",
    });
    await extractTemplates();
  },
});
