module.exports = {
  docs: [
    { About: ["about", "live-lambda-development", "design-principles", "faq"] },
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
