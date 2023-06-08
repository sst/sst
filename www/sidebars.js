module.exports = {
  docs: [
    {
      " ": [
        "index",
        "what-is-sst",
        {
          type: "category",
          label: "Get Started",
          collapsible: true,
          collapsed: false,
          items: [
            "start/standalone",
            "start/nextjs",
            "start/remix",
            "start/svelte",
            "start/astro",
            "start/solid",
          ],
        },
      ],
    },
    //    {
    //      "Get Started": [
    //        "start/basics",
    //        "start/nextjs",
    //        "start/astro",
    //        "start/vite",
    //      ],
    //    },
    //    {
    //      Features: [
    //        {
    //          type: "category",
    //          label: "Databases",
    //          collapsible: true,
    //          collapsed: true,
    //          link: {type: "doc", id: "databases/index"},
    //          items: [
    //            "databases/postgresql",
    //            "databases/dynamodb",
    //          ]
    //        },
    //        "apis",
    //        "auth",
    //        {
    //          type: "category",
    //          label: "Jobs",
    //          collapsible: true,
    //          collapsed: true,
    //          link: {type: "doc", id: "jobs/index"},
    //          items: [
    //            "jobs/cron-jobs",
    //            "jobs/long-running-jobs",
    //          ]
    //        },
    //        "config",
    //        "queues",
    //        "file-uploads",
    //      ]
    //    },
    {
      "How-Tos": [
        "apis",
        "auth",
        "config",
        "cron-jobs",
        "databases",
        "async-tasks",
        "file-uploads",
        "long-running-jobs",
      ],
    },
    {
      Info: [
        "testing",
        "console",
        "live-lambda-development",
        "configuring-sst",
        "custom-domains",
        "design-principles",
        "resource-binding",
        "editor-integration",
        "going-to-production",
        "faq",
        {
          type: "category",
          label: "Advanced",
          collapsible: true,
          collapsed: true,
          items: [
            "advanced/monitoring",
            "advanced/source-maps",
            "known-issues",
            "advanced/bootstrapping",
            "advanced/extending-sst",
            "upgrade-guide",
            "advanced/removal-policy",
            "advanced/lambda-layers",
            "advanced/iam-credentials",
            "advanced/tagging-resources",
            "advanced/importing-resources",
            "advanced/connecting-via-proxy",
            "advanced/permission-boundary",
            "anonymous-telemetry",
            "advanced/cross-stack-references",
            "working-with-your-team",
            "advanced/linting-and-type-checking",
            "advanced/customizing-ssm-parameters",
            //"advanced/monorepo-project-structure",
            "advanced/environment-specific-resources",
          ],
        },
      ],
    },
    {
      "Migrating From": [
        "migrating/cdk",
        "migrating/vercel",
        "migrating/serverless-framework",
      ],
    },
    {
      CLI: ["packages/sst", "packages/create-sst"],
    },
  ],
  learn: [
    "learn/index",
    {
      type: "category",
      label: "1 - Installation",
      items: [
        "learn/create-a-new-project",
        "learn/project-structure",
        "learn/initialize-the-database",
        "learn/start-the-frontend",
        "learn/breakpoint-debugging",
      ],
    },
    {
      type: "category",
      label: "2 - Add a New Feature",
      items: ["learn/domain-driven-design", "learn/write-to-the-database"],
    },
    {
      type: "category",
      label: "3 - Add to the API",
      items: [
        "learn/graphql-api",
        "learn/add-api-types",
        "learn/queries-and-mutations",
      ],
    },
    {
      type: "category",
      label: "4 - Update the Frontend",
      items: ["learn/render-queries", "learn/make-updates"],
    },
    {
      type: "category",
      label: "5 - Deployment",
      items: ["learn/deploy-to-prod"],
    },
  ],
  constructs: [
    {
      " ": ["constructs/index"],
    },
    {
      Core: [
        "constructs/App",
        "constructs/Stack",
        "constructs/Function",
        {
          type: "category",
          label: "Config",
          collapsible: true,
          collapsed: true,
          items: ["constructs/Secret", "constructs/Parameter"],
        },
      ],
      Frontend: [
        "constructs/StaticSite",
        "constructs/NextjsSite",
        "constructs/SvelteKitSite",
        "constructs/RemixSite",
        "constructs/AstroSite",
        "constructs/SolidStartSite",
      ],
      Database: ["constructs/RDS", "constructs/Table"],
      Api: [
        "constructs/Api",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi",
      ],
      Async: [
        "constructs/Job",
        "constructs/Cron",
        "constructs/Topic",
        "constructs/Queue",
        "constructs/EventBus",
        "constructs/KinesisStream",
      ],
      Storage: ["constructs/Bucket"],
      Auth: ["constructs/Auth", "constructs/Cognito"],
      Types: [
        "constructs/Size",
        "constructs/Duration",
        "constructs/Permissions",
      ],
      Other: [
        "constructs/Script",
        "constructs/ApiGatewayV1Api",
        "constructs/v1/index",
        "constructs/v0/index",
      ],
    },
  ],
  clients: [
    {
      " ": ["clients/index"],
      Modules: [
        "clients/api",
        "clients/rds",
        "clients/job",
        "clients/site",
        "clients/auth",
        "clients/table",
        "clients/topic",
        "clients/config",
        "clients/queue",
        "clients/bucket",
        "clients/graphql",
        "clients/function",
        "clients/event-bus",
        "clients/kinesis-stream",
      ],
    },
  ],
  constructsv1: [
    {
      " ": ["constructs/v1/index"],
    },
    {
      Core: [
        "constructs/v1/App",
        "constructs/v1/Stack",
        "constructs/v1/Function",
        {
          type: "category",
          label: "Config",
          collapsible: true,
          collapsed: true,
          items: ["constructs/v1/Secret", "constructs/v1/Parameter"],
        },
      ],
      Api: [
        "constructs/v1/Api",
        "constructs/v1/AppSyncApi",
        "constructs/v1/WebSocketApi",
      ],
      Frontend: [
        "constructs/v1/StaticSite",
        "constructs/v1/NextjsSite",
        "constructs/v1/RemixSite",
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
      Auth: ["constructs/v1/Auth", "constructs/v1/Cognito"],
      Types: [
        "constructs/v1/Size",
        "constructs/v1/Duration",
        "constructs/v1/Permissions",
      ],
      Other: [
        "constructs/v1/Job",
        "constructs/v1/Script",
        "constructs/v1/DebugApp",
        "constructs/v1/DebugStack",
        "constructs/v1/GraphQLApi",
        "constructs/v1/ViteStaticSite",
        "constructs/v1/ReactStaticSite",
        "constructs/v1/ApiGatewayV1Api",
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
      Internals: ["constructs/v0/DebugApp", "constructs/v0/DebugStack"],
    },
  ],
};
