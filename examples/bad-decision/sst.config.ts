/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "bad-decision",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        "@pulumiverse/vercel": {
          team: "12345678",
        },
      },
    };
  },
  async run() {
    const project = new vercel.Project("WebProject", {
      name: "bad-decision",
    });
    const dir = vercel.getProjectDirectoryOutput({
      path: process.cwd() + "/api",
    });
    const deployment = new vercel.Deployment("WebDeployment", {
      projectId: project.id,
      production: $app.stage === "production",
      files: dir.files,
      pathPrefix: process.cwd(),
    });
  },
});
