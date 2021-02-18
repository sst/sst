import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { App } from "./App";
import {
  Function as Func,
  FunctionProps,
  FunctionDefinition,
} from "./Function";
import { Permissions } from "./util/permission";

const allowedMethods = [
  apig.HttpMethod.ANY,
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
  readonly routes: { [key: string]: FunctionDefinition | ApiRouteProps };

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
  readonly httpApi?: apig.HttpApi;
}

/**
 * Props for API route.
 */
export interface ApiRouteProps {
  readonly authorizationType?: string;
  readonly function?: FunctionDefinition;
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

    const root = scope.node.root as App;
    const {
      // Api props
      cors,
      accessLog,
      httpApi,
      // Routes props
      routes,
      defaultAuthorizationType,
      defaultFunctionProps,
    } = props;

    // Validate input
    if (httpApi !== undefined && cors !== undefined) {
      throw new Error(`Cannot define both cors and httpApi`);
    }
    if (httpApi !== undefined && accessLog !== undefined) {
      throw new Error(`Cannot define both accessLog and httpApi`);
    }

    ////////////////////
    // Create Api
    ////////////////////

    if (!httpApi) {
      // Configure CORS
      let corsPreflight;
      if (cors === undefined || cors === true) {
        // We want CORS to allow all methods, however
        // - if we set allowMethods to ["*"], type check would fail b/c allowMethods
        //   is exptected to take an array of HttpMethod, not "*"
        // - if we set allowMethod to all allowedMethods, CloudFormation will fail
        //   b/c ANY is not acceptable.
        // So, we filter out ANY from allowedMethods. See CDK issue -
        // https://github.com/aws/aws-cdk/issues/10230
        corsPreflight = {
          allowHeaders: ["*"],
          allowMethods: allowedMethods.filter((m) => m !== apig.HttpMethod.ANY),
          allowOrigins: ["*"],
        };
      }

      this.httpApi = new apig.HttpApi(this, "Api", {
        apiName: root.logicalPrefixedName(id),
        corsPreflight,
      });
    } else {
      this.httpApi = httpApi;
    }

    ///////////////////////////
    // Create access log
    ///////////////////////////

    // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
    //       need to define it at L1 construct level.
    if (!httpApi && (accessLog === undefined || accessLog === true)) {
      // create log group
      this.accessLogGroup = new logs.LogGroup(this, "LogGroup");

      // get log format
      const logFormat = JSON.stringify({
        // request info
        requestTime: "$context.requestTime",
        requestId: "$context.requestId",
        httpMethod: "$context.httpMethod",
        path: "$context.path",
        routeKey: "$context.routeKey",
        status: "$context.status",
        responseLatency: "$context.responseLatency",
        // integration info
        integrationRequestId: "$context.integration.requestId",
        integrationStatus: "$context.integration.status",
        integrationLatency: "$context.integration.latency",
        integrationServiceStatus: "$context.integration.integrationStatus",
        // caller info
        ip: "$context.identity.sourceIp",
        userAgent: "$context.identity.userAgent",
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
      // Normalize routeProps
      const routeProps = (this.isInstanceOfApiRouteProps(
        routes[routeKey] as ApiRouteProps
      )
        ? routes[routeKey]
        : {
            function: routes[routeKey] as FunctionDefinition,
          }) as ApiRouteProps;

      // Normalize routeKey
      routeKey = this.normalizeRouteKey(routeKey);

      // Get path and method
      const routeKeyParts = routeKey.split(" ");
      if (routeKeyParts.length !== 2) {
        throw new Error(`Invalid route ${routeKey}`);
      }
      const methodStr = routeKeyParts[0].toUpperCase();
      const path = routeKeyParts[1];
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

      // Create Function
      let functionDefinition;
      if (typeof routeProps.function === "string") {
        functionDefinition = {
          ...(defaultFunctionProps || {}),
          handler: routeProps.function,
        };
      } else if (routeProps.function instanceof Func) {
        if (defaultFunctionProps) {
          throw new Error(
            `Cannot define defaultFunctionProps when a Function is passed in to the routes`
          );
        }
        functionDefinition = routeProps.function;
      } else {
        functionDefinition = {
          ...(defaultFunctionProps || {}),
          ...(routeProps.function as FunctionProps),
        } as FunctionProps;
      }
      const lambda = Func.fromDefinition(
        this,
        `Lambda_${methodStr}_${path}`,
        functionDefinition
      );

      // Create route
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

  isInstanceOfApiRouteProps(object: ApiRouteProps): boolean {
    return (
      object.function !== undefined || object.authorizationType !== undefined
    );
  }

  normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }

  getFunction(routeKey: string): Func {
    return this.functions[this.normalizeRouteKey(routeKey)];
  }

  attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((func) =>
      func.attachPermissions(permissions)
    );
  }

  attachPermissionsToRoute(routeKey: string, permissions: Permissions): void {
    const func = this.getFunction(routeKey);
    func.attachPermissions(permissions);
  }
}
