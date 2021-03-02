import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
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

export enum ApiAuthorizationType {
  JWT = "JWT",
  NONE = "NONE",
  AWS_IAM = "AWS_IAM",
}

export enum ApiPayloadFormatVersion {
  V1 = "1.0",
  V2 = "2.0",
}

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

  readonly customDomain?: string | ApiCustomDomainProps;
  readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly defaultAuthorizationScopes?: string[];
  readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;

  /**
   * Default authorization type for routes.
   *
   * @default - Defaults to 'NONE'
   */
  readonly defaultAuthorizationType?: ApiAuthorizationType;

  /**
   * Default Lambda props for routes.
   */
  readonly defaultFunctionProps?: FunctionProps;

  /**
   * Default HTTP Api props.
   */
  readonly httpApi?: apig.HttpApi;
}

export interface ApiRouteProps {
  readonly authorizationType?: ApiAuthorizationType;
  readonly function?: FunctionDefinition;
}

export interface ApiCustomDomainProps {
  readonly domainName: string;
  readonly hostedZone?: string;
  readonly path?: string;
}

export class Api extends cdk.Construct {
  public readonly httpApi: apig.HttpApi;
  public readonly accessLogGroup?: logs.LogGroup;
  private readonly functions: { [key: string]: Func };

  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      // Api props
      cors,
      accessLog,
      customDomain,
      httpApi,
      // Routes props
      routes,
      defaultFunctionProps,
      defaultAuthorizer,
      defaultAuthorizationType,
      defaultAuthorizationScopes,
      defaultPayloadFormatVersion,
    } = props;

    // Validate input
    if (httpApi !== undefined && cors !== undefined) {
      throw new Error(`Cannot define both cors and httpApi`);
    }
    if (httpApi !== undefined && accessLog !== undefined) {
      throw new Error(`Cannot define both accessLog and httpApi`);
    }
    if (httpApi !== undefined && customDomain !== undefined) {
      throw new Error(`Cannot define both customDomain and httpApi`);
    }

    ////////////////////
    // Create CORS configuration
    ////////////////////

    let corsPreflight;
    if (!httpApi && (cors === undefined || cors === true)) {
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

    ////////////////////
    // Create Custom Domain
    ////////////////////

    let defaultDomainMapping;
    if (!httpApi && customDomain !== undefined) {
      // To be implemented: to allow more flexible use cases, SST should support two more use cases:
      //  1. Allow user passing in `hostedZone` object. The use case is when there are multiple
      //     HostedZones with the same domain, but one is public, and one is private.
      //  2. Allow user passing in `certificate` object. The use case is for user to create wildcard
      //     certificate or using an imported certificate.
      //  3. Allow user passing in `apigDomain` object. The use case is a user creates multiple API
      //     endpoints, and is mapping them under the same custom domain. `sst.Api` needs to expose the
      //     `apigDomain` construct created in the first Api, and lets user pass it in when creating
      //     the second Api.

      let domainName, hostedZoneDomain, mappingKey;

      // customDomain passed in as a string
      if (typeof customDomain === "string") {
        domainName = customDomain;
        hostedZoneDomain = customDomain.split(".").slice(1).join(".");
      }
      // customDomain passed in as an object
      else {
        if (!customDomain.domainName) {
          throw new Error(
            `Missing "domainName" in sst.Api's customDomain setting`
          );
        }
        domainName = customDomain.domainName;
        hostedZoneDomain =
          customDomain.hostedZone ||
          customDomain.domainName.split(".").slice(1).join(".");
        mappingKey = customDomain.path;
      }

      // Look up hosted zone
      const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: hostedZoneDomain,
      });
      if (!hostedZone) {
        throw new Error(
          `Cannot find hosted zone "${hostedZoneDomain}" in Route 53`
        );
      }

      // Create certificate
      const certificate = new acm.Certificate(this, "Certificate", {
        domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      // Create custom domain in API Gateway
      const apigDomain = new apig.DomainName(this, "DomainName", {
        domainName,
        certificate,
      });

      // Create DNS record
      new route53.ARecord(this, "AliasRecord", {
        recordName: domainName,
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayv2Domain(apigDomain)
        ),
      });

      defaultDomainMapping = {
        domainName: apigDomain,
        mappingKey,
      };
    }

    ////////////////////
    // Create Api
    ////////////////////

    if (!httpApi) {
      this.httpApi = new apig.HttpApi(this, "Api", {
        apiName: root.logicalPrefixedName(id),
        corsPreflight,
        defaultDomainMapping,
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

      // Get authorization: currently SST does not allow using multiple authorizers.
      const authorizationType =
        routeProps.authorizationType ||
        defaultAuthorizationType ||
        ApiAuthorizationType.NONE;
      if (!Object.values(ApiAuthorizationType).includes(authorizationType)) {
        throw new Error(
          `sst.Api does not currently support ${authorizationType}. Only "AWS_IAM" and "JWT" are currently supported.`
        );
      }
      let authorizer, authorizationScopes;
      if (authorizationType === ApiAuthorizationType.JWT) {
        authorizer = defaultAuthorizer;
        authorizationScopes = defaultAuthorizationScopes;
      }
      if (authorizationType === ApiAuthorizationType.JWT && !authorizer) {
        throw new Error(`Missing JWT authorizer for "${routeKey}"`);
      }

      // Get payload format
      const payloadFormatVersion =
        defaultPayloadFormatVersion || ApiPayloadFormatVersion.V2;
      if (
        !Object.values(ApiPayloadFormatVersion).includes(payloadFormatVersion)
      ) {
        throw new Error(
          `sst.Api does not currently support ${payloadFormatVersion} payload format version. Only "V1" and "V2" are currently supported.`
        );
      }
      const integrationPayloadFormatVersion =
        payloadFormatVersion === ApiPayloadFormatVersion.V1
          ? apig.PayloadFormatVersion.VERSION_1_0
          : apig.PayloadFormatVersion.VERSION_2_0;

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
          payloadFormatVersion: integrationPayloadFormatVersion,
        }),
        authorizer,
        authorizationScopes,
      });

      // Configure route authorization type
      // Note: we need to explicitly set `cfnRoute.authorizationType` to `NONE` because if it were
      //       set to `AWS_IAM`, and then it is removed from the CloudFormation template
      //       (ie. set to undefined), CloudFormation doesn't updates the route. The route's
      //       authorizationType would still be `AWS_IAM`.
      if (
        authorizationType === ApiAuthorizationType.AWS_IAM ||
        authorizationType === ApiAuthorizationType.NONE
      ) {
        if (!route.node.defaultChild) {
          throw new Error(
            `Failed to define the default route for "${routeKey}"`
          );
        }
        const cfnRoute = route.node.defaultChild as apig.CfnRoute;
        cfnRoute.authorizationType = authorizationType;
      }

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
