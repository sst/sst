export default definePreset({
  name: "Base: example",
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
