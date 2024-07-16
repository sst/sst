import { Input, Output, interpolate, output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { ApiGatewayV2RouteArgs } from "./apigatewayv2";
import { apigatewayv2 } from "@pulumi/aws";

export interface ApiGatewayV2BaseRouteArgs extends ApiGatewayV2RouteArgs {
  /**
   * The cluster to use for the service.
   */
  api: Input<{
    /**
     * The name of the cluster.
     */
    name: Input<string>;
    /**
     * The ID of the cluster.
     */
    id: Input<string>;
    /**
     * The execution ARN of the cluster.
     */
    executionArn: Input<string>;
  }>;
  route: Input<string>;
}

export function createApiRoute(
  name: string,
  args: ApiGatewayV2BaseRouteArgs,
  integrationId: Output<string>,
  parent: Component,
) {
  const authArgs = output(args.auth).apply((auth) => {
    if (auth?.iam) return { authorizationType: "AWS_IAM" };
    if (auth?.jwt)
      return {
        authorizationType: "JWT",
        authorizationScopes: auth.jwt.scopes,
        authorizerId: auth.jwt.authorizer,
      };
    return { authorizationType: "NONE" };
  });

  return authArgs.apply(
    (authArgs) =>
      new apigatewayv2.Route(
        `${name}Route`,
        transform(args.transform?.route, {
          apiId: output(args.api).id,
          routeKey: args.route,
          target: interpolate`integrations/${integrationId}`,
          ...authArgs,
        }),
        { parent },
      ),
  );
}
