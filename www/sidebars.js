module.exports = {
  docs: [
    { Introduction: ["about", "live-lambda-development"] },
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
      "Added Constructs": [
        "constructs/App",
        "constructs/Api",
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
