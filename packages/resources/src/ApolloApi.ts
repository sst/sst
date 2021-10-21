import * as cdk from "@aws-cdk/core";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import {
  Api,
  ApiProps,
  ApiFunctionRouteProps,
  ApiPayloadFormatVersion,
} from "./Api";
import { Function as Fn, FunctionDefinition } from "./Function";

/////////////////////
// Interfaces
/////////////////////

export interface ApolloApiProps extends Omit<ApiProps, "routes"> {
  readonly server: FunctionDefinition;
  readonly route?: string;
}

/////////////////////
// Construct
/////////////////////

export class ApolloApi extends Api {
  private lambdaIntegration?: apig.IHttpRouteIntegration;
  private route?: string;

  constructor(scope: cdk.Construct, id: string, props: ApolloApiProps) {
    const { server, route = '/', defaultPayloadFormatVersion, ...restProps } = props || {};
    
    // Validate server
    if (!server) {
      throw new Error(`Missing "server" in the "${id}" ApolloApi`);
    }

    // Validate routes
    const { routes } = props as ApiProps;
    if (routes) {
      throw new Error(
        `Please use the "server" option instead of the "routes" to configure the handler for the "${id}" ApolloApi`
      );
    }

    super(scope, id, {
      ...restProps,
      defaultPayloadFormatVersion:
        defaultPayloadFormatVersion || ApiPayloadFormatVersion.V1,
      routes: {
        [`GET ${route}`]: server,
        [`POST ${route}`]: server,
      },
    });

    this.route = route;
  }

  public get serverFunction(): Fn {
    const serverFn = this.getFunction(`GET ${this.route}`);

    // This should never happen
    if (!serverFn) {
      throw new Error(
        `Failed to get "serverFunction" in the "${this.node.id}" ApolloApi`
      );
    }

    return serverFn;
  }

  // Note: We want to create 1 Lambda handling both the GET and POST request.
  //       This design is based on this discussion on GitHub
  //       https://github.com/serverless-stack/serverless-stack/issues/601
  // Also Note: We cannot use the "ANY /" route because if authorization
  //            were provided, the OPTIONS route will be protected. This
  //            causes CORS to fail.
  // Solution: We will override the createFunctionIntegration() function, and
  //           it will re-use the same Route Integration for all routes.
  protected createFunctionIntegration(
    scope: cdk.Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps,
    postfixName: string
  ): apig.IHttpRouteIntegration {
    if (!this.lambdaIntegration) {
      this.lambdaIntegration = super.createFunctionIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    }

    return this.lambdaIntegration;
  }
}
