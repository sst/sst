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
      Constructs: [
        "constructs/api",
        "constructs/app",
        "constructs/function",
        "constructs/stack",
      ],
    },
  ],
};
