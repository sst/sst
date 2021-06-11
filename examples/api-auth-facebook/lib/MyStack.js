import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Api
    const api = new sst.Api(this, "Api", {
      defaultAuthorizationType: sst.ApiAuthorizationType.AWS_IAM,
      routes: {
        "GET /private": "src/private.main",
        "GET /public": {
          function: "src/public.main",
          authorizationType: sst.ApiAuthorizationType.NONE,
        },
      },
    });

    // Create auth provider
    const auth = new sst.Auth(this, "Auth", {
      facebook: { appId: "419718329085014" },
    });

    // Allow authenticated users invoke API
    auth.attachPermissionsForAuthUsers([api]);

    // Show the API endpoint and other info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      IdentityPoolId: auth.cognitoCfnIdentityPool.ref,
    });
  }
}
