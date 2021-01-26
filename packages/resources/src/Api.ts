import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { Stack } from "./Stack";
import { Function as Func, FunctionProps } from "./Function";

const allowedMethods = [
  apig.HttpMethod.GET,
  apig.HttpMethod.PUT,
  apig.HttpMethod.POST,
  apig.HttpMethod.HEAD,
  apig.HttpMethod.PATCH,
  apig.HttpMethod.DELETE,
  apig.HttpMethod.OPTIONS,
];

export interface ApiProps {
  /**
   * Path to the entry point of the function. A .js or .ts file.
   */
  readonly routes: { [key: string]: string | ApiRouteProps };

  /**
   * CORS configuration.
   *
   * @default - Defaults to true
   */
  readonly cors?: boolean;

  /**
   * Access log configuration.
   *
   * @default - Defaults to true
   */
  readonly accessLog?: boolean;

  /**
   * Default authorization type for routes.
   *
   * @default - Defaults to 'NONE'
   */
  readonly defaultAuthorizationType?: string;

  /**
   * Default Lambda props for routes.
   */
  readonly defaultFunctionProps?: FunctionProps;

  /**
   * Default HTTP Api props.
   */
  readonly httpApiProps?: apig.HttpApiProps;
}

/**
 * Props for API route.
 */
export interface ApiRouteProps {
  /**
   * Route authorization type
   *
   * @default - Defaults to 'NONE'
   */
  readonly authorizationType?: string;

  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default - Defaults to {}
   */
  readonly functionProps?: FunctionProps;
}

export class Api extends cdk.Construct {
  /**
   * The created HttpApi construct.
   */
  public readonly httpApi: apig.HttpApi;

  /**
   * The created Access Log Group construct.
   */
  public readonly accessLogGroup?: logs.LogGroup;

  /**
   * Functions indexed by route.
   */
  private readonly functions: { [key: string]: Func };

  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      // Convenience props
      cors,
      accessLog,
      routes,
      defaultAuthorizationType,
      defaultFunctionProps,
      // Full functionality props
      httpApiProps,
    } = props;

    ////////////////////
    // Configure CORS
    ////////////////////

    // Validate input
    if (cors !== undefined && httpApiProps !== undefined) {
      throw new Error(`Cannot define both cors and httpApiProps`);
    }

    let apiProps;
    if (httpApiProps === undefined) {
      let corsPreflight;
      if (cors === undefined || cors === true) {
        corsPreflight = {
          allowHeaders: ["*"],
          allowMethods: allowedMethods,
          allowOrigins: ["*"],
        };
      }
      apiProps = { corsPreflight };
    } else {
      apiProps = { ...httpApiProps };
    }

    ////////////////////
    // Create Api
    ////////////////////
    apiProps.apiName = apiProps.apiName || `${Stack.of(this).stackName}-${id}`;
    this.httpApi = new apig.HttpApi(this, "Api", apiProps);

    ///////////////////////////
    // Configure access log
    ///////////////////////////

    // Validate input
    if (accessLog !== undefined && httpApiProps !== undefined) {
      throw new Error(`Cannot define both accessLog and httpApiProps`);
    }

    // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
    //       need to define it at L1 construct level.
    if (
      httpApiProps === undefined &&
      (accessLog === undefined || accessLog === true)
    ) {
      // create log group
      this.accessLogGroup = new logs.LogGroup(this, "LogGroup");

      // get log format
      const logFormat = JSON.stringify({
        path: "$context.path",
        status: "$context.status",
        routeKey: "$context.routeKey",
        protocol: "$context.protocol",
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        httpMethod: "$context.httpMethod",
        requestTime: "$context.requestTime",
        responseLength: "$context.responseLength",
        responseLatency: "$context.responseLatency",
        cognitoIdentityId: "$context.identity.cognitoIdentityId",
      });

      // get L1 cfnStage construct
      if (!this.httpApi.defaultStage?.node.defaultChild) {
        throw new Error(`Failed to define the default stage for Http API`);
      }

      // set access log settings
      const cfnStage = this.httpApi.defaultStage.node
        .defaultChild as apig.CfnStage;
      cfnStage.accessLogSettings = {
        format: logFormat,
        destinationArn: this.accessLogGroup.logGroupArn,
      };
    }

    ///////////////////////////
    // Configure routes
    ///////////////////////////

    // Validate input
    if (!routes) {
      throw new Error(`Missing "routes" in sst.Api`);
    }
    const routeKeys = Object.keys(routes);
    if (routeKeys.length === 0) {
      throw new Error("At least 1 route is required");
    }

    this.functions = {};

    routeKeys.forEach((routeKey: string) => {
      let routeProps = routes[routeKey];
      if (typeof routeProps === "string") {
        routeProps = { functionProps: { handler: routeProps } };
      }

      // Get path and method
      const routeNameParts = routeKey.split(/\s+/);
      if (routeNameParts.length !== 2) {
        throw new Error(`Invalid route ${routeKey}`);
      }
      const methodStr = routeNameParts[0].toUpperCase();
      const path = routeNameParts[1];
      const method = allowedMethods.find((per) => per === methodStr);
      if (!method) {
        throw new Error(`Invalid method defined for "${routeKey}"`);
      }
      if (path.length === 0) {
        throw new Error(`Invalid path defined for "${routeKey}"`);
      }

      // Get authorization type
      let authorizationType =
        routeProps.authorizationType || defaultAuthorizationType || "NONE";
      authorizationType = authorizationType.toUpperCase();
      if (!["NONE", "AWS_IAM"].includes(authorizationType)) {
        throw new Error(
          `sst.Api does not currently support ${authorizationType}. Only "AWS_IAM" is currently supported.`
        );
      }

      // Get Lambda props
      const functionProps = {
        ...(defaultFunctionProps || {}),
        ...routeProps.functionProps,
      } as FunctionProps;
      if (!functionProps.handler) {
        throw new Error(`No handler defined for "${routeKey}"`);
      }

      // Create route
      const lambda = new Func(
        this,
        `Lambda_${methodStr}_${path}`,
        functionProps
      );
      const route = new apig.HttpRoute(this, `Route_${methodStr}_${path}`, {
        httpApi: this.httpApi,
        routeKey: apig.HttpRouteKey.with(path, method),
        integration: new apigIntegrations.LambdaProxyIntegration({
          handler: lambda,
        }),
      });

      // Configure route authorization type
      if (!route.node.defaultChild) {
        throw new Error(`Failed to define the default route for "${routeKey}"`);
      }
      const cfnRoute = route.node.defaultChild as apig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;

      // Store function
      this.functions[routeKey] = lambda;
    });
  }

  getFunction(routeKey: string): Func {
    return this.functions[routeKey];
  }
}
