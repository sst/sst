module.exports = {
  docs: [
    "about",
    {
      "Quick Start": [
        "installation",
        "architecture",
        "live-lambda-development",
        "console"
      ]
    },
    {
      Learn: [
        {
          type: "category",
          label: "1 - Installation",
          collapsible: true,
          collapsed: true,
          items: [
            {
              type: "doc",
              id: "api",
              label: "Installation & Starting Development"
            },

            // Describe file Structure
            { type: "doc", id: "api", label: "Project Structure" },

            // Review launch.json
            // Show auto-complete
            // Show TS Doc
            { type: "doc", id: "api", label: "Editor Integration" },

            // Make a request in the Console
            { type: "doc", id: "api", label: "API Explorer" },

            // Show the function was ran locally
            { type: "doc", id: "api", label: "Live Lambda Development" }
          ]
        },
        {
          type: "category",
          label: "2 - Adding comments Table",
          collapsible: true,
          collapsed: true,
          items: [
            { type: "doc", id: "api", label: "What is RDS" },

            // Explain the idea of keeping business logic seperate (D)
            { type: "doc", id: "api", label: "Add list and update functions" },

            // Create an new migration
            // Run the migration in the Console
            { type: "doc", id: "api", label: "Running Migrations" },

            // Review generated types
            { type: "doc", id: "api", label: "Auto-generate Types" },

            // Show the implementation again using DynamoDB
            { type: "doc", id: "api", label: "Using DynamoDB" },

            // Link to examples for DynamoDB, Mongo, etc
            { type: "doc", id: "api", label: "Other Database options" }
          ]
        },
        {
          type: "category",
          label: "3 - Building comments API",
          collapsible: true,
          collapsed: true,
          items: [
            // Explain GraphQL and Pothos code first approach (D)
            { type: "doc", id: "api", label: "GraphQL API" },
            { type: "doc", id: "api", label: "Adding an API Types" },
            // Explain thinking when designing queries and mutations (D)
            { type: "doc", id: "api", label: "Adding API Queries & Mutations" }
          ]
        },
        {
          type: "category",
          label: "4 - Rendering comments",
          collapsible: true,
          collapsed: true,
          items: [
            { type: "doc", id: "api", label: "Calling the API" },
            { type: "doc", id: "api", label: "Rendering in React" },

            // Link to examples for Vue, Next.js
            { type: "doc", id: "api", label: "Other Frontend options" }
          ]
        },
        {
          type: "category",
          label: "5 - Deployment",
          collapsible: true,
          collapsed: true,
          items: [
            { type: "doc", id: "api", label: "Setup AWS Credentials" },
            { type: "doc", id: "api", label: "Deployment" },
            { type: "doc", id: "api", label: "Deploying with Seed" }
          ]
        },
        {
          type: "doc",
          label: "Intermission",
          id: "api"
        },
        {
          // I think each of these things deserves its own section (from dax)
          type: "category",
          label: "6 - Examples",
          collapsible: true,
          collapsed: true,
          items: [
            // Create a Bucket construct
            // Add an API Mutation for generating prefixed url
            // Implementing file upload in the frontend
            // View the uploaded file in Console
            { type: "doc", id: "api", label: "Upload files" },

            // Create a Cron construct
            { type: "doc", id: "api", label: "Cron Jobs" },

            // Create comments created and comments removed SNS topics
            // Fire events
            // View comment count updated in SST Console
            // Link to examples for Queues, EventBuses, and KinesisStreams
            { type: "doc", id: "api", label: "Events" },

            // Add a RESTful route
            // Invoke the endpoint in Console
            { type: "doc", id: "api", label: "Webhooks" },

            // Add Cognito Auth construct
            // Implement backend
            // Implement signup/login on Frontend
            // Create a user in Console
            // Test out the auth flow
            // Link to examples for Facebook, Google, GitHub examples
            { type: "doc", id: "api", label: "Auth" },

            // Link to examples for WebSocket and AppSyncApi
            { type: "doc", id: "api", label: "Other API options" }
          ]
        },
        {
          type: "category",
          label: "7 - Going to Production",
          collapsible: true,
          collapsed: true,
          items: [
            { type: "doc", id: "api", label: "Testing" },
            { type: "doc", id: "api", label: "Going to Production" },
            { type: "doc", id: "api", label: "Environment Variables" },
            { type: "doc", id: "api", label: "Working with Your Team" }
          ]
        },
        //"api",
        //"auth",
        //"storage",
        //"database",
        //"frontend",
        //"cron-jobs",
        //"asynchronous-tasks",
        //"going-to-production",
        //"environment-variables",
        //"working-with-your-team",
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
            "advanced/environment-specific-resources"
          ]
        }
      ]
    },
    {
      "Migrating From": ["migrating/cdk", "migrating/serverless-framework"]
    },
    {
      More: ["known-issues", "design-principles", "anonymous-telemetry", "faq"]
    },
    {
      Packages: [
        "packages/cli",
        "packages/create-sst",
        "packages/resources",
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
      Util: ["util/Permissions"]
    },
    {
      Internals: ["constructs/DebugApp", "constructs/DebugStack"]
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
      Core: ["constructs/App", "constructs/Stack", "constructs/Function"],
      Api: [
        "constructs/Api",
        "constructs/GraphQLApi",
        "constructs/AppSyncApi",
        "constructs/WebSocketApi"
      ],
      Frontend: [
        "constructs/StaticSite",
        "constructs/NextjsSite",
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
      Auth: ["constructs/Auth"],
      Types: [
        "constructs/Size",
        "constructs/Duration",
        "constructs/Permissions"
      ],
      Other: [
        "constructs/Script",
        "constructs/DebugApp",
        "constructs/DebugStack",
        "constructs/ApiGatewayV1Api"
      ]
    }
  ]
};
