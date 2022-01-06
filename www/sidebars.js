module.exports = {
  docs: [
    { About: ["about", "design-principles", "live-lambda-development", "faq"] },
    {
      Usage: [
        "installation",
        "working-locally",
        "deploying-your-app",
        "environment-variables",
        "working-with-your-team",
        "debugging-with-vscode",
        "managing-iam-credentials",
        "monitoring-your-app-in-prod",
        "known-issues",
        "anonymous-telemetry",
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
        "packages/static-site-env",
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
        "constructs/Script", // shorter in length viewed in browser
        "constructs/Queue",
        "constructs/Bucket",
        "constructs/Function",
        "constructs/EventBus",
        "constructs/StaticSite", // shorter in length viewed in browser
        "constructs/ApolloApi",
        "constructs/NextjsSite",
        "constructs/AppSyncApi",
        "constructs/KinesisStream", // shorter in length viewed in browser
        "constructs/WebSocketApi",
        "constructs/ReactStaticSite",
        "constructs/ApiGatewayV1Api",
      ],
    },
    {
      Util: ["util/Permissions"],
    },
  ],
};
