export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await installPackages({
      packages: ["prisma", "fs-extra", "@prisma/client"],
      additionalArgs: ["-w", "backend"],
    });
    await installPackages({
      packages: ["@types/fs-extra", "prisma"],
      additionalArgs: ["-w", "backend"],
      dev: true,
    });
  },
});
