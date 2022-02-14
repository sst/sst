module.exports = {
  docs: [
    {
      About: [
        "about",
        "installation",
        "architecture",
        "live-lambda-development",
      ],
    },
    {
      Usage: [
        "api",
        "auth",
        "storage",
        "database",
        "frontend",
        "cron-jobs",
        "asynchronous-tasks",
        "going-to-production",
        "environment-variables",
        "working-with-your-team",
        {
          type: "category",
          label: "Advanced",
          collapsible: true,
          collapsed: true,
          items: [
            "advanced/testing",
            "advanced/monitoring",
            "advanced/source-maps",
            "advanced/extending-sst",
            "advanced/removal-policy",
            "advanced/lambda-layers",
            "advanced/iam-credentials",
            "advanced/tagging-resources",
            "advanced/importing-resources",
            "advanced/permission-boundary",
            "advanced/cross-stack-references",
            "advanced/linting-and-type-checking",
            "advanced/monorepo-project-structure",
            "advanced/environment-specific-resources",
          ],
        },
      ],
    },
    {
      "Migrating From": ["migrating/cdk", "migrating/serverless-framework"],
    },
    {
      More: ["known-issues", "design-principles", "anonymous-telemetry", "faq"],
    },
    {
      Constructs: [
        "constructs/Api",
        "constructs/App",
        "constructs/RDS",
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
        "constructs/ViteStaticSite", // shorter in length viewed in browser
        "constructs/KinesisStream", // shorter in length viewed in browser
        "constructs/WebSocketApi",
        "constructs/ReactStaticSite",
        "constructs/ApiGatewayV1Api",
      ],
    },
    {
      Util: ["util/Permissions"],
    },
    {
      Packages: [
        "packages/cli",
        "packages/create-serverless-stack",
        "packages/resources",
        "packages/static-site-env",
      ],
    },
  ],
};
