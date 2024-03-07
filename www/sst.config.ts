/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "www",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          profile: input.stage === "production" ? "sst-production" : "sst-dev",
        },
      },
    };
  },
  async run() {
    const isPersonal = $app.stage !== "production" && $app.stage !== "dev";

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
    }

    const domain =
      {
        production: "ion.sst.dev",
        dev: "dev.ion.sst.dev",
      }[$app.stage] || $app.stage + "dev.ion.sst.dev";

    const zone = isPersonal
      ? await aws.route53.getZone({
          name: domain,
        })
      : new aws.route53.Zone("Zone", {
          name: domain,
        });

    new sst.aws.Astro("Astro", {
      domain: {
        domainName: domain,
        hostedZoneId: zone.zoneId,
      },
    });
  },
});
