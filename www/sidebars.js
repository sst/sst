module.exports = {
  docs: [
    { About: ["about", "design-principles", "live-lambda-development", "faq"] },
    {
      Usage: [
        "installation",
        "working-locally",
        "deploying-your-app",
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
        "constructs/Function",
      ],
    },
    {
      Util: ["util/Permissions"],
    },
  ],
};
