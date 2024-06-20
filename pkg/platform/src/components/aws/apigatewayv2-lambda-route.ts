import {
  ComponentResourceOptions,
  Input,
  Output,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Function, FunctionArgs } from "./function";
import { ApiGatewayV2RouteArgs } from "./apigatewayv2";

export interface Args extends ApiGatewayV2RouteArgs {
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
  /**
   * The route function.
   */
  handler: Input<string | FunctionArgs>;
  handlerTransform?: Transform<FunctionArgs>;
}

/**
 * The `ApiGatewayV2LambdaRoute` component is internally used by the `ApiGatewayV2` component
 * to add routes to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayV2` component.
 */
export class ApiGatewayV2LambdaRoute extends Component {
  private readonly fn: Output<Function>;
  private readonly permission: aws.lambda.Permission;
  private readonly apiRoute: Output<aws.apigatewayv2.Route>;
  private readonly integration: aws.apigatewayv2.Integration;

  constructor(name: string, args: Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const self = this;
    const api = output(args.api);
    const route = output(args.route);

    const fn = createFunction();
    const permission = createPermission();
    const integration = createIntegration();
    const apiRoute = createApiRoute();

    this.fn = fn;
    this.permission = permission;
    this.apiRoute = apiRoute;
    this.integration = integration;

    function createFunction() {
      return Function.fromDefinition(
        `${name}Handler`,
        args.handler,
        {
          description: interpolate`${api.name} route ${route}`,
        },
        args.handlerTransform,
        { parent: self },
      );
    }

    function createPermission() {
      return new aws.lambda.Permission(
        `${name}Permissions`,
        {
          action: "lambda:InvokeFunction",
          function: fn.arn,
          principal: "apigateway.amazonaws.com",
          sourceArn: interpolate`${api.executionArn}/*`,
        },
        { parent: self },
      );
    }

    function createIntegration() {
      return new aws.apigatewayv2.Integration(
        `${name}Integration`,
        transform(args.transform?.integration, {
          apiId: api.id,
          integrationType: "AWS_PROXY",
          integrationUri: fn.arn,
          payloadFormatVersion: "2.0",
        }),
        { parent: self, dependsOn: [permission] },
      );
    }

    function createApiRoute() {
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
          new aws.apigatewayv2.Route(
            `${name}Route`,
            transform(args.transform?.route, {
              apiId: api.id,
              routeKey: route,
              target: interpolate`integrations/${integration.id}`,
              ...authArgs,
            }),
            { parent: self },
          ),
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    const self = this;
    return {
      /**
       * The Lambda function.
       */
      function: this.fn,
      /**
       * The Lambda permission.
       */
      permission: this.permission,
      /**
       * The API Gateway HTTP API route.
       */
      route: this.apiRoute,
      /**
       * The API Gateway HTTP API integration.
       */
      integration: this.integration,
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV2LambdaRoute";
// @ts-expect-error
ApiGatewayV2LambdaRoute.__pulumiType = __pulumiType;
