module.exports = {
  docs: [
    { About: ["about", "design-principles", "live-lambda-development", "faq"] },
    {
      Usage: [
        "installation",
        "working-locally",
        "deploying-your-app",
        "migrating-from-cdk",
        "known-issues",
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
        "constructs/Table",
        "constructs/Topic",
        "constructs/Stack",
        "constructs/Queue",
        "constructs/Function",
      ],
    },
  ],
};
