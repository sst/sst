import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { Stack } from "./Stack";
import { Function, FunctionProps } from "./Function";

const allowedMethods = [
  apig.HttpMethod.DELETE,
  apig.HttpMethod.GET,
  apig.HttpMethod.HEAD,
  apig.HttpMethod.OPTIONS,
  apig.HttpMethod.PATCH,
  apig.HttpMethod.POST,
  apig.HttpMethod.PUT,
];

export interface ApiProps {
  /**
   * Path to the entry point of the function. A .js or .ts file.
   */
  readonly routes: { [key: string]: string | RouteProps };

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
  readonly defaultLambdaProps?: FunctionProps;

  /**
   * Default HTTP Api props.
   */
  readonly httpApiProps?: apig.HttpApiProps;
}

/**
 * Props for API route.
 */
export interface RouteProps {
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
  readonly lambdaProps?: FunctionProps;
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

  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      // convenient props
      cors,
      accessLog,
      routes,
      defaultAuthorizationType,
      defaultLambdaProps,
      // full functionality props
      httpApiProps,
    } = props;

    ////////////////////
    // Configure CORS
    ////////////////////

    // Validate input
    if (cors !== undefined && httpApiProps !== undefined) {
      throw new Error(`Cannot define both cors and httpApiProps.`);
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
      throw new Error(`Cannot define both accessLog and httpApiProps.`);
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
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        routeKey: "$context.routeKey",
        path: "$context.path",
        status: "$context.status",
        protocol: "$context.protocol",
        cognitoIdentityId: "$context.identity.cognitoIdentityId",
        responseLatency: "$context.responseLatency",
        responseLength: "$context.responseLength",
      });

      // get L1 cfnStage construct
      if (!this.httpApi.defaultStage?.node.defaultChild) {
        throw new Error(`Fail to define the default stage for Http API.`);
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
      throw new Error(`Missing 'routes' in sst.Api.`);
    }
    const routeKeys = Object.keys(routes);
    if (routeKeys.length === 0) {
      throw new Error("At least 1 route is required.");
    }

    routeKeys.forEach((routeKey: string) => {
      let routeProps = routes[routeKey];
      if (typeof routeProps === "string") {
        routeProps = { lambdaProps: { handler: routeProps } };
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
        throw new Error(`Invalid method defined for route ${routeKey}`);
      }
      if (path.length === 0) {
        throw new Error(`Invalid path defined for route ${routeKey}`);
      }

      // Get authorization type
      let authorizationType =
        routeProps.authorizationType || defaultAuthorizationType || "NONE";
      authorizationType = authorizationType.toUpperCase();
      if (!["NONE", "AWS_IAM"].includes(authorizationType)) {
        throw new Error(
          `sst.Api does not support ${authorizationType} authorization type. Only 'NONE' and 'AWS_IAM' types are currently supported.`
        );
      }

      // Get Lambda props
      const lambdaProps = {
        ...(defaultLambdaProps || {}),
        ...routeProps.lambdaProps,
      } as FunctionProps;
      if (!lambdaProps.handler) {
        throw new Error(`No Lambda handler defined for route ${routeKey}`);
      }

      // Create route
      const lambda = new Function(
        this,
        `Lambda_${methodStr}_${path}`,
        lambdaProps
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
        throw new Error(
          `Fail to define the default route for route ${routeKey}.`
        );
      }
      const cfnRoute = route.node.defaultChild as apig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;
    });
  }
}
