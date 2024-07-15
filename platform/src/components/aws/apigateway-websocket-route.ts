import {
  ComponentResourceOptions,
  Input,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Function, FunctionArgs } from "./function";
import { ApiGatewayWebSocketRouteArgs } from "./apigateway-websocket";
import { apigatewayv2, lambda } from "@pulumi/aws";

export interface Args extends ApiGatewayWebSocketRouteArgs {
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
  handler: Input<string | FunctionArgs>;
  handlerTransform?: Transform<FunctionArgs>;
}

/**
 * The `ApiGatewayWebSocketRoute` component is internally used by the `ApiGatewayWebSocket`
 * component to add routes to [AWS API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayWebSocket` component.
 */
export class ApiGatewayWebSocketRoute extends Component {
  private readonly fn: Output<Function>;
  private readonly permission: lambda.Permission;
  private readonly apiRoute: apigatewayv2.Route;
  private readonly integration: apigatewayv2.Integration;

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
      return new lambda.Permission(
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
      return new apigatewayv2.Integration(
        `${name}Integration`,
        transform(args.transform?.integration, {
          apiId: api.id,
          integrationType: "AWS_PROXY",
          integrationUri: fn.arn,
        }),
        { parent: self, dependsOn: [permission] },
      );
    }

    function createApiRoute() {
      return new apigatewayv2.Route(
        `${name}Route`,
        transform(args.transform?.route, {
          apiId: api.id,
          routeKey: route,
          target: interpolate`integrations/${integration.id}`,
          authorizationType: all([args.route, args.auth]).apply(
            ([route, auth]) =>
              route === "$connect" && auth?.iam ? "AWS_IAM" : "NONE",
          ),
        }),
        { parent: self },
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
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

const __pulumiType = "sst:aws:ApiGatewayWebSocketRoute";
// @ts-expect-error
ApiGatewayWebSocketRoute.__pulumiType = __pulumiType;
