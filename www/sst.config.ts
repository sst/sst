/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "www",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          profile: (() => {
            if (process.env.GITHUB_ACTIONS) return undefined;
            if (input.stage === "production") {
              return "sst-production";
            }
            return "sst-dev";
          })(),
        },
      },
    };
  },
  async run() {
    const isPersonal = $app.stage !== "production" && $app.stage !== "dev";
    const domain =
      {
        production: "ion.sst.dev",
        dev: "dev.ion.sst.dev",
      }[$app.stage] || $app.stage + "dev.ion.sst.dev";

    if (!isPersonal) {
      const oidc = new aws.iam.OpenIdConnectProvider("GithubOidc", {
        clientIdLists: ["sts.amazonaws.com"],
        thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
        url: `https://token.actions.githubusercontent.com`,
      });
      const role = new aws.iam.Role("GithubRole", {
        name: `www-${$app.stage}-GithubRole`,
        assumeRolePolicy: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Federated: oidc.arn,
              },
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringLike: {
                  "token.actions.githubusercontent.com:sub": `repo:sst/ion:*`,
                },
              },
            },
          ],
        },
      });
      new aws.iam.RolePolicyAttachment("GithubRolePolicy", {
        role: role.name,
        policyArn: aws.iam.ManagedPolicies.AdministratorAccess,
      });
      new aws.route53.Zone("Zone", {
        name: domain,
      });
    }

    new sst.aws.Astro("Astro", {
      domain,
    });

    const telemetry = new sst.aws.Router("TelemetryRouter", {
      domain: "telemetry." + domain,
      routes: {
        "/*": "https://us.i.posthog.com",
      },
    });

    return {
      telemetry: telemetry.url,
    };
  },
});
