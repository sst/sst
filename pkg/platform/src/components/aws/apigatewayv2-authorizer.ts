import { ComponentResourceOptions, Input, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, transform } from "../component";
import { ApiGatewayV2AuthorizerArgs } from "./apigatewayv2";

export interface AuthorizerArgs extends ApiGatewayV2AuthorizerArgs {
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
  }>;
}

/**
 * The `ApiGatewayV2Authorizer` component is internally used by the `ApiGatewayV2` component
 * to add authorizers to [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `addAuthorizer` method of the `ApiGatewayV2` component.
 */
export class ApiGatewayV2Authorizer extends Component {
  private readonly authorizer: aws.apigatewayv2.Authorizer;

  constructor(
    name: string,
    args: AuthorizerArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const self = this;

    const api = output(args.api);
    const jwt = output(args.jwt);

    const authorizer = createAuthorizer();

    this.authorizer = authorizer;

    function createAuthorizer() {
      return new aws.apigatewayv2.Authorizer(
        `${name}Authorizer`,
        transform(args.transform?.authorizer, {
          apiId: api.id,
          authorizerType: "JWT",
          identitySources: [
            jwt.apply(
              (jwt) => jwt.identitySource ?? "$request.header.Authorization",
            ),
          ],
          jwtConfiguration: jwt.apply((jwt) => ({
            audiences: jwt.audiences,
            issuer: jwt.issuer,
          })),
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
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV2Authorizer";
// @ts-expect-error
ApiGatewayV2Authorizer.__pulumiType = __pulumiType;
