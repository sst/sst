export default definePreset({
  name: "Starter: Typescript",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/starter",
    });
    await extractTemplates();
  },
});
