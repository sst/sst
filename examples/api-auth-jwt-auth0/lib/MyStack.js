import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Api
    const api = new sst.Api(this, "Api", {
      defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer({
        jwtAudience: ["r7MQkwTZjIzcKhGmlcy9QhMNXnT9qhwX"],
        jwtIssuer: "https://sst-test.us.auth0.com/",
      }),
      defaultAuthorizationType: sst.ApiAuthorizationType.JWT,
      routes: {
        "GET /private": "src/private.main",
        "GET /public": {
          function: "src/public.main",
          authorizationType: sst.ApiAuthorizationType.NONE,
        },
      },
    });

    // Show the API endpoint and other info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
