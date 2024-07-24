import {
  ComponentResourceOptions,
  Input,
  Output,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Function, FunctionArgs } from "./function";
import { ApiGatewayV1RouteArgs } from "./apigatewayv1";
import { apigateway, lambda } from "@pulumi/aws";

export interface Args extends ApiGatewayV1RouteArgs {
  /**
   * The API Gateway to use for the route.
   */
  api: Input<{
    /**
     * The name of the API Gateway.
     */
    name: Input<string>;
    /**
     * The ID of the API Gateway.
     */
    id: Input<string>;
    /**
     * The execution ARN of the API Gateway.
     */
    executionArn: Input<string>;
  }>;
  /**
   * The route method.
   */
  method: string;
  /**
   * The route path.
   */
  path: string;
  /**
   * The route resource ID.
   */
  resourceId: Input<string>;
  /**
   * The route function.
   */
  handler: Input<string | FunctionArgs>;
  /**
   * @internal
   */
  handlerTransform?: Transform<FunctionArgs>;
}

/**
 * The `ApiGatewayV1LambdaRoute` component is internally used by the `ApiGatewayV1` component
 * to add routes to your [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `route` method of the `ApiGatewayV1` component.
 */
export class ApiGatewayV1LambdaRoute extends Component {
  private readonly fn: Output<Function>;
  private readonly permission: lambda.Permission;
  private readonly integration: apigateway.Integration;

  constructor(name: string, args: Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const self = this;
    const api = output(args.api);

    const method = createMethod();
    const fn = createFunction();
    const permission = createPermission();
    const integration = createIntegration();

    this.fn = fn;
    this.permission = permission;
    this.integration = integration;

    function createMethod() {
      const { method, resourceId, auth } = args;

      const authArgs = output(auth).apply((auth) => {
        if (auth?.iam) return { authorization: "AWS_IAM" };
        else if (auth?.custom)
          return { authorization: "CUSTOM", authorizerId: auth.custom };
        else if (auth?.cognito)
          return {
            authorization: "COGNITO_USER_POOLS",
            authorizerId: auth.cognito.authorizer,
            authorizationScopes: auth.cognito.scopes,
          };
        return { authorization: "NONE" };
      });

      return authArgs.apply(
        (authArgs) =>
          new apigateway.Method(
            `${name}Method`,
            {
              restApi: api.id,
              resourceId: resourceId,
              httpMethod: method,
              authorization: authArgs.authorization,
              authorizerId: authArgs.authorizerId,
              authorizationScopes: authArgs.authorizationScopes,
            },
            { parent: self },
          ),
      );
    }

    function createFunction() {
      const { method, path } = args;

      return Function.fromDefinition(
        `${name}Handler`,
        args.handler,
        {
          description: interpolate`${api.name} route ${method} ${path}`,
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
      return new apigateway.Integration(
        ...transform(
          args.transform?.integration,
          `${name}Integration`,
          {
            restApi: api.id,
            resourceId: args.resourceId,
            httpMethod: method.httpMethod,
            integrationHttpMethod: "POST",
            type: "AWS_PROXY",
            uri: fn.nodes.function.invokeArn,
          },
          { parent: self, dependsOn: [permission] },
        ),
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
       * The API Gateway REST API integration.
       */
      integration: this.integration,
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV1LambdaRoute";
// @ts-expect-error
ApiGatewayV1LambdaRoute.__pulumiType = __pulumiType;
