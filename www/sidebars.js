module.exports = {
  docs: [
    {
      " ": [
        "index",
        "what-is-sst",
        "quick-start",
        {
          type: "category",
          label: "Frontends",
          collapsible: true,
          collapsed: false,
          link: {type: "doc", id: "frontends/index"},
          items: [
            "frontends/nextjs",
            "frontends/remix",
            "frontends/astro",
            "frontends/solid",
            "frontends/static-sites",
          ]
        },
      ]
    },
    {
      Features: [
        {
          type: "category",
          label: "Databases",
          collapsible: true,
          collapsed: true,
          link: {type: "doc", id: "databases/index"},
          items: [
            "databases/postgresql",
            "databases/dynamodb",
          ]
        },
        "apis",
        "auth",
        {
          type: "category",
          label: "Jobs",
          collapsible: true,
          collapsed: true,
          link: {type: "doc", id: "jobs/index"},
          items: [
            "jobs/cron-jobs",
            "jobs/long-running-jobs",
          ]
        },
        "config",
        "queues",
        "file-uploads",
      ]
    },
    {
      "How-Tos": [
        {
          type: "category",
          label: "Local Dev",
          collapsible: true,
          collapsed: true,
          items: [
            "live-lambda-development",
            "console",
            "editor-integration",
          ]
        },
        "testing",
        "resource-binding",
        "going-to-production",
        "working-with-your-team",
        {
          type: "category",
          label: "Advanced",
          collapsible: true,
          collapsed: true,
          items: [
            "advanced/monitoring",
            "advanced/source-maps",
            "advanced/extending-sst",
            "advanced/removal-policy",
            "advanced/lambda-layers",
            "advanced/iam-credentials",
            "advanced/tagging-resources",
            "advanced/importing-resources",
            "advanced/connecting-via-proxy",
            "advanced/permission-boundary",
            "advanced/cross-stack-references",
            "advanced/linting-and-type-checking",
            "advanced/customizing-ssm-parameters",
            //"advanced/monorepo-project-structure",
            "advanced/environment-specific-resources"
          ]
        },
      ]
    },
    {
      Info: [
        "known-issues",
        "upgrade-guide",
        "design-principles",
        "anonymous-telemetry",
        "faq"
      ]
    },
    {
      "Migrating From": ["migrating/cdk", "migrating/serverless-framework"]
    },
    {
      Reference: [
        {
          type: "link",
          label: "Constructs",
          href: "/constructs"
        },
        {
          type: "link",
          label: "Clients",
          href: "/clients"
        },
      ]
    },
    {
      CLI: [
        "packages/sst",
        "packages/sst-env",
        "packages/create-sst",
      ]
    }
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
        "learn/breakpoint-debugging"
      ]
    },
    {
      type: "category",
      label: "2 - Add a New Feature",
      items: [
        "learn/domain-driven-design",
        "learn/write-to-the-database",
      ]
    },
    {
      type: "category",
      label: "3 - Add to the API",
      items: [
        "learn/graphql-api",
        "learn/add-api-types",
        "learn/queries-and-mutations"
      ]
    },
    {
      type: "category",
      label: "4 - Update the Frontend",
      items: [
        "learn/render-queries",
        "learn/make-updates",
      ]
    },
    {
      type: "category",
      label: "5 - Deployment",
      items: [
        "learn/deploy-to-prod",
      ]
    }
  ],
  constructsv0: [
    {
      " ": ["constructs/v0/index", "constructs/v0/migration"]
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
        "constructs/v0/ApiGatewayV1Api"
      ]
    },
    {
      Util: ["constructs/v0/Permissions"]
    },
    {
      Internals: ["constructs/v0/DebugApp", "constructs/v0/DebugStack"]
    }
  ],
  constructs: [
    {
      " ": [
        "constructs/index",
        {
          type: "link",
          label: "v0 Constructs",
          href: "/constructs/v0"
        },
        {
          type: "link",
          label: "Migrate to v1.0",
          href: "/constructs/v0/migration"
        }
      ]
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
          items: [
            "constructs/Secret",
            "constructs/Parameter",
          ],
        }
      ],
      Api: [
        "constructs/Api",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi"
      ],
      Frontend: [
        "constructs/StaticSite",
        "constructs/NextjsSite",
        "constructs/RemixSite",
        "constructs/AstroSite",
        "constructs/SolidStartSite",
      ],
      Database: ["constructs/RDS", "constructs/Table"],
      Async: [
        "constructs/Cron",
        "constructs/Topic",
        "constructs/Queue",
        "constructs/EventBus",
        "constructs/KinesisStream"
      ],
      Storage: ["constructs/Bucket"],
      Auth: ["constructs/Auth", "constructs/Cognito"],
      Types: [
        "constructs/Size",
        "constructs/Duration",
        "constructs/Permissions"
      ],
      Other: [
        "constructs/Job",
        "constructs/Script",
        "constructs/DebugApp",
        "constructs/DebugStack",
        "constructs/GraphQLApi",
        "constructs/ViteStaticSite",
        "constructs/ReactStaticSite",
        "constructs/ApiGatewayV1Api"
      ]
    }
  ],
  clients: [
    {
      " ": [
        "clients/index",
      ],
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
      ]
    },
  ],
};
