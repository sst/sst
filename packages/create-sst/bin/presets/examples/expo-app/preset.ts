export default definePreset({
  name: "example",
  options: {},
  handler: async () => {
    await applyNestedPreset({
      preset: "presets/base/example",
    });
    await extractTemplates({});
    await editFiles({
      files: ["package.json"],
      operations: [
        {
          type: "edit-json",
          merge: {
            workspaces: ["frontend"],
          },
        },
      ],
    });
    await installPackages({
      packages: ["aws-sdk"],
      additionalArgs: ["-w", "backend"],
    });
  },
});
