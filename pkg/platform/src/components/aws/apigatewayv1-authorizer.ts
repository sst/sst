import {
  ComponentResourceOptions,
  Input,
  Output,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, transform } from "../component";
import { Function } from "./function";
import { VisibleError } from "../error";
import { ApiGatewayV1AuthorizerArgs } from "./apigatewayv1";

export interface AuthorizerArgs extends ApiGatewayV1AuthorizerArgs {
  /**
   * The api to use for the route.
   */
  api: Input<{
    /**
     * The name of the api.
     */
    name: Input<string>;
    /**
     * The ID of the api.
     */
    id: Input<string>;
    /**
     * The execution ARN of the api.
     */
    executionArn: Input<string>;
  }>;
}

/**
 * The `ApiGatewayV1Authorizer` component is internally used by the `ApiGatewayV1` component
 * to add authorizers to [Amazon API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `addAuthorizer` method of the `ApiGatewayV1` component.
 */
export class ApiGatewayV1Authorizer extends Component {
  private readonly authorizer: aws.apigateway.Authorizer;
  private readonly fn?: Output<sst.aws.Function>;
  private readonly permission?: aws.lambda.Permission;

  constructor(
    name: string,
    args: AuthorizerArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const self = this;

    const api = output(args.api);

    validateSingleAuthorizer();
    const type = getType();

    const fn = createFunction();
    const authorizer = createAuthorizer();
    const permission = createPermission();

    this.fn = fn;
    this.authorizer = authorizer;
    this.permission = permission;

    function validateSingleAuthorizer() {
      const authorizers = [
        args.requestFunction,
        args.tokenFunction,
        args.userPools,
      ].filter((e) => e);

      if (authorizers.length === 0)
        throw new VisibleError(
          `Please provide one of "requestFunction", "tokenFunction", or "userPools" for the ${args.name} authorizer.`,
        );

      if (authorizers.length > 1) {
        throw new VisibleError(
          `Please provide only one of "requestFunction", "tokenFunction", or "userPools" for the ${args.name} authorizer.`,
        );
      }
    }

    function getType() {
      if (args.tokenFunction) return "TOKEN";
      if (args.requestFunction) return "REQUEST";
      if (args.userPools) return "COGNITO_USER_POOLS";
    }

    function createFunction() {
      const fn = args.tokenFunction ?? args.requestFunction;
      if (!fn) return;

      return Function.fromDefinition(`${name}Function`, fn, {
        description: `${api.name} authorizer`,
      });
    }

    function createPermission() {
      if (!fn) return;

      return new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: fn.arn,
          principal: "apigateway.amazonaws.com",
          sourceArn: interpolate`${api.executionArn}/authorizers/${authorizer.id}`,
        },
        { parent: self },
      );
    }

    function createAuthorizer() {
      return new aws.apigateway.Authorizer(
        `${name}Authorizer`,
        transform(args.transform?.authorizer, {
          restApi: api.id,
          type,
          name: args.name,
          providerArns: args.userPools,
          authorizerUri: fn?.nodes.function.invokeArn,
          authorizerResultTtlInSeconds: args.ttl,
          identitySource: args.identitySource,
        }),
        { parent: self },
      );
    }
  }

  /**
   * The id of the authorizer.
   */
  public get id() {
    return this.authorizer.id;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    const self = this;
    return {
      /**
       * The Amazon AppSync DataSource.
       */
      authorizer: this.authorizer,
      /**
       * The Lambda function used by the data source.
       */
      get function() {
        if (!self.fn)
          throw new VisibleError(
            "Cannot access `nodes.function` because the data source does not use a Lambda function.",
          );
        return self.fn;
      },
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV1Authorizer";
// @ts-expect-error
ApiGatewayV1Authorizer.__pulumiType = __pulumiType;
