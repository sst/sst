module.exports = {
  docs: [
    {
      " ": ["index", "quick-start"]
    },
    {
      Overview: [
        "what-is-sst",
        "live-lambda-development",
        "console",
        "resource-binding",
        "editor-integration",
      ]
    },
    {
      Learn: [
        "learn/index",
        {
          type: "category",
          label: "1 - Installation",
          collapsible: true,
          collapsed: true,
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
          collapsible: true,
          collapsed: true,
          items: [
            "learn/domain-driven-design",
            //"learn/database-options",
            "learn/write-to-the-database",
            //"learn/write-to-dynamodb"
          ]
        },
        {
          type: "category",
          label: "3 - Add to the API",
          collapsible: true,
          collapsed: true,
          items: [
            "learn/graphql-api",
            "learn/add-api-types",
            "learn/queries-and-mutations"
          ]
        },
        {
          type: "category",
          label: "4 - Update the Frontend",
          collapsible: true,
          collapsed: true,
          items: [
            "learn/render-queries",
            "learn/make-updates",
            //Link to Vue example
            //Link to Next.js example
            //"learn/frontend-options",
          ]
        },
        {
          type: "category",
          label: "5 - Deployment",
          collapsible: true,
          collapsed: true,
          items: [
            "learn/deploy-to-prod",
            //"learn/git-push-to-deploy"
          ]
        }
      ]
    },
    {
      "Learn More": [
        // Add Cognito Auth construct
        // Implement backend
        // Implement signup/login on Frontend
        // Create a user in Console
        // Test out the auth flow
        // Link to examples for Facebook, Google, GitHub examples
        //{ type: "doc", id: "api", label: "Auth" },

        // Create a Bucket construct
        // Add an API Mutation for generating prefixed url
        // Implementing file upload in the frontend
        // View the uploaded file in Console
        //{ type: "doc", id: "api", label: "File Upload" },

        // Create a Cron construct
        //{ type: "doc", id: "api", label: "Cron Jobs" },

        // Create comments created and comments removed SNS topics
        // Fire events
        // View comment count updated in SST Console
        // Link to examples for Queues, EventBuses, and KinesisStreams
        //{ type: "doc", id: "api", label: "Events" },

        // Add a RESTful route
        // Invoke the endpoint in Console
        //{ type: "doc", id: "api", label: "RESTful routes" },

        //"api",
        //"storage",
        //"database",
        //"frontend",
        //"cron-jobs",
        //"asynchronous-tasks",

        "auth",
        "config",
        "advanced/testing",
        "long-running-jobs",
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
            //"advanced/monorepo-project-structure",
            "advanced/environment-specific-resources"
          ]
        }
      ]
    },
    {
      "Migrating From": ["migrating/cdk", "migrating/serverless-framework"]
    },
    {
      More: [
        "known-issues",
        "upgrade-guide",
        "design-principles",
        "anonymous-telemetry",
        "faq"
      ]
    },
    {
      Packages: [
        "packages/create-sst",
        "packages/cli",
        {
          type: "link",
          label: "@serverless-stack/node",
          href: "/clients",
        },
        {
          type: "link",
          label: "@serverless-stack/resources",
          href: "/constructs",
        },
        "packages/static-site-env"
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
        "constructs/GraphQLApi",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi"
      ],
      Frontend: [
        "constructs/StaticSite",
        "constructs/NextjsSite",
        "constructs/RemixSite",
        "constructs/ViteStaticSite",
        "constructs/ReactStaticSite"
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
