/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-cognito",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const userPool = new sst.aws.CognitoUserPool("MyUserPool");
    const client = userPool.addClient("Web");
    const identityPool = new sst.aws.CognitoIdentityPool("MyIdentityPool", {
      userPools: [
        {
          userPool: userPool.id,
          client: client.id,
        },
      ],
    });

    return {
      UserPool: userPool.id,
      Client: client.id,
      IdentityPool: identityPool.id,
    };
  },
});
