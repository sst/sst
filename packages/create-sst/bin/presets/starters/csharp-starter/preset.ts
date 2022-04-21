export default definePreset({
  name: "Starter: F#",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/starter",
    });
    await extractTemplates();
  },
});
