/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-python-huggingface",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "local",
      providers: {
        aws: true
      }
    };
  },
  async run() {
    const python = new sst.aws.Function("MyPythonFunction", {
      python: {
        container: true,
      },
      handler: "src/python.handler",
      runtime: "python3.11",
      url: true
    });

    return {
      python: python.url
    }
  },
});
