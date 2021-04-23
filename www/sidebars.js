module.exports = {
  docs: [
    { About: ["about", "design-principles", "live-lambda-development", "faq"] },
    {
      Usage: [
        "installation",
        "working-locally",
        "deploying-your-app",
        "environment-variables",
        "debugging-with-vscode",
        "known-issues",
      ],
    },
    {
      "Migrating From": [
        "migrating-from-cdk",
        "migrating-from-serverless-framework",
      ],
    },
    {
      Packages: [
        "packages/cli",
        "packages/create-serverless-stack",
        "packages/resources",
      ],
    },
    {
      Constructs: [
        "constructs/Api",
        "constructs/App",
        "constructs/Cron",
        "constructs/Auth",
        "constructs/Table",
        "constructs/Topic",
        "constructs/Stack",
        "constructs/Queue",
        "constructs/Bucket",
        "constructs/Function",
        "constructs/ApolloApi",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi",
        "constructs/ApiGatewayV1Api",
      ],
    },
    {
      Util: ["util/Permissions"],
    },
  ],
};
