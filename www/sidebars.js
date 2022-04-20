module.exports = {
  docs: [
    {
      Overview: [
        "about",
        "installation",
        "architecture",
        "live-lambda-development",
        "console",
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
      Packages: [
        "packages/cli",
        "packages/create-serverless-stack",
        "packages/resources",
        "packages/static-site-env",
      ],
    },
  ],
  constructs: [
    {
      " ": ["constructs/index", "constructs/migration"],
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
        "constructs/NextjsSite",
        "constructs/AppSyncApi",
        "constructs/GraphQLApi",
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
      Internals: ["constructs/DebugApp", "constructs/DebugStack"],
    },
  ],
  constructsV1: [
    "constructs/v1/index",
    {
      Core: [
        "constructs/v1/App",
        "constructs/v1/Stack",
        "constructs/v1/Function",
        "constructs/v1/Permissions",
      ],
      Api: [
        "constructs/v1/Api",
        "constructs/v1/GraphQLApi",
        "constructs/v1/AppSyncApi",
        "constructs/v1/WebSocketApi",
      ],
      Frontend: [
        "constructs/v1/StaticSite",
        "constructs/v1/NextjsSite",
        "constructs/v1/ViteStaticSite",
        "constructs/v1/ReactStaticSite",
      ],
      Database: ["constructs/v1/RDS", "constructs/v1/Table"],
      Async: [
        "constructs/v1/Cron",
        "constructs/v1/Topic",
        "constructs/v1/Queue",
        "constructs/v1/EventBus",
        "constructs/v1/KinesisStream",
      ],
      Storage: ["constructs/v1/Bucket"],
      Auth: ["constructs/v1/Auth"],
      Other: [
        "constructs/v1/Script",
        "constructs/v1/Size",
        "constructs/v1/Duration",
        "constructs/v1/ApiGatewayV1Api",
        "constructs/v1/DebugApp",
        "constructs/v1/DebugStack",
      ],
    },
  ],
};
