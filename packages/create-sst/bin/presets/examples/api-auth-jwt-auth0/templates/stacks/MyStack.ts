import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    authorizers: {
      jwt: {
        type: "jwt",
        cdk: {
          authorizer: new apigAuthorizers.HttpJwtAuthorizer(
            "Authorizer",
            "https://sst-test.us.auth0.com/",
            {
              jwtAudience: ["r7MQkwTZjIzcKhGmlcy9QhMNXnT9qhwX"],
            }
          ),
        },
      },
    },
    defaults: {
      authorizer: "jwt",
    },
    routes: {
      "GET /private": "private.main",
      "GET /public": {
        function: "public.main",
        authorizer: "jwt",
      },
    },
  });

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
