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
            //"advanced/monorepo-project-structure",
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
        "packages/create-sst",
        "packages/resources",
        "packages/static-site-env",
      ],
    },
  ],
  constructsv0: [
    {
      " ": ["constructs/v0/index", "constructs/v0/migration"],
    },
    {
      Constructs: [
        "constructs/v0/Api",
        "constructs/v0/App",
        "constructs/v0/RDS",
        "constructs/v0/Cron",
        "constructs/v0/Auth",
        "constructs/v0/Table",
        "constructs/v0/Topic",
        "constructs/v0/Stack",
        "constructs/v0/Script", // shorter in length viewed in browser
        "constructs/v0/Queue",
        "constructs/v0/Bucket",
        "constructs/v0/Function",
        "constructs/v0/EventBus",
        "constructs/v0/StaticSite", // shorter in length viewed in browser
        "constructs/v0/NextjsSite",
        "constructs/v0/AppSyncApi",
        "constructs/v0/GraphQLApi",
        "constructs/v0/ViteStaticSite", // shorter in length viewed in browser
        "constructs/v0/KinesisStream", // shorter in length viewed in browser
        "constructs/v0/WebSocketApi",
        "constructs/v0/ReactStaticSite",
        "constructs/v0/ApiGatewayV1Api",
      ],
    },
    {
      Util: ["constructs/v0/Permissions"],
    },
    {
      Internals: [
        "constructs/v0/DebugApp",
        "constructs/v0/DebugStack",
      ],
    },
  ],
  constructs: [
    {
      " ": [
        "constructs/index",
        {
          type: "link",
          label: "v0 Constructs",
          href: "/constructs/v0",
        },
        {
          type: "link",
          label: "Migrate to v1.0",
          href: "/constructs/v0/migration",
        },
      ],
    },
    {
      Core: ["constructs/App", "constructs/Stack", "constructs/Function"],
      Api: [
        "constructs/Api",
        "constructs/GraphQLApi",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi",
      ],
      Frontend: [
        "constructs/StaticSite",
        "constructs/NextjsSite",
        "constructs/ViteStaticSite",
        "constructs/ReactStaticSite",
      ],
      Database: ["constructs/RDS", "constructs/Table"],
      Async: [
        "constructs/Cron",
        "constructs/Topic",
        "constructs/Queue",
        "constructs/EventBus",
        "constructs/KinesisStream",
      ],
      Storage: ["constructs/Bucket"],
      Auth: ["constructs/Auth"],
      Types: [
        "constructs/Size",
        "constructs/Duration",
        "constructs/Permissions",
      ],
      Other: [
        "constructs/Script",
        "constructs/DebugApp",
        "constructs/DebugStack",
        "constructs/ApiGatewayV1Api",
      ],
    },
  ],
};
