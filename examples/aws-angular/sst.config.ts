/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-angular",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      access: "public",
    });

    const pre = new sst.aws.Function("MyFunction", {
      url: true,
      link: [bucket],
      handler: "functions/presigned.handler",
    });

    new sst.aws.StaticSite("MyWeb", {
      dev: {
        command: "npm run start",
      },
      build: {
        output: "dist/browser",
        command: "ng build --output-path dist",
      },
      environment: {
        NG_APP_PRESIGNED_API: pre.url
      }
    });
  },
});

