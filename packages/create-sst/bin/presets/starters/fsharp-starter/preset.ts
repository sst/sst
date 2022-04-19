export default definePreset({
  name: "Starter: C#",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/typescript",
    });
    await applyNestedPreset({
      preset: "presets/base/monorepo",
    });
    await extractTemplates();
  },
});
