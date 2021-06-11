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
      auth0: {
        domain: "https://myorg.us.auth0.com",
        clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
      },
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
