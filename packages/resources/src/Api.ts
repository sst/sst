import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
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

/////////////////////
// Interfaces
/////////////////////

export interface ApiProps {
  readonly httpApi?: apig.IHttpApi | apig.HttpApiProps;
  readonly routes?: { [key: string]: FunctionDefinition | ApiRouteProps };
  readonly cors?: boolean | apig.CorsPreflightOptions;
  readonly accessLog?:
    | boolean
    | string
    | apig.CfnStage.AccessLogSettingsProperty;
  readonly customDomain?: string | ApiCustomDomainProps;

  readonly defaultFunctionProps?: FunctionProps;
  readonly defaultAuthorizationType?: ApiAuthorizationType;
  readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly defaultAuthorizationScopes?: string[];
  readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;
}

export interface ApiRouteProps {
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
  readonly payloadFormatVersion?: ApiPayloadFormatVersion;
  readonly function: FunctionDefinition;
}

export interface ApiCustomDomainProps {
  readonly domainName: string | apig.IDomainName;
  readonly hostedZone?: string | route53.IHostedZone;
  readonly certificate?: acm.ICertificate;
  readonly path?: string;
}

/////////////////////
// Construct
/////////////////////

export class Api extends cdk.Construct {
  public readonly httpApi: apig.HttpApi;
  public readonly accessLogGroup?: logs.LogGroup;
  public apiGatewayDomain?: apig.DomainName;
  public acmCertificate?: acm.Certificate;
  private readonly functions: { [key: string]: Fn };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  private readonly defaultAuthorizationType?: ApiAuthorizationType;
  private readonly defaultAuthorizationScopes?: string[];
  private readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;

  constructor(scope: cdk.Construct, id: string, props?: ApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      httpApi,
      routes,
      cors,
      accessLog,
      customDomain,
      defaultFunctionProps,
      defaultAuthorizer,
      defaultAuthorizationType,
      defaultAuthorizationScopes,
      defaultPayloadFormatVersion,
    } = props || {};
    this.functions = {};
    this.permissionsAttachedForAllRoutes = [];
    this.defaultFunctionProps = defaultFunctionProps;
    this.defaultAuthorizer = defaultAuthorizer;
    this.defaultAuthorizationType = defaultAuthorizationType;
    this.defaultAuthorizationScopes = defaultAuthorizationScopes;
    this.defaultPayloadFormatVersion = defaultPayloadFormatVersion;

    ////////////////////
    // Create Api
    ////////////////////

    if (cdk.Construct.isConstruct(httpApi)) {
      if (cors !== undefined) {
        throw new Error(
          `Cannot configure the "cors" when "httpApi" is a construct`
        );
      }
      if (accessLog !== undefined) {
        throw new Error(
          `Cannot configure the "accessLog" when "httpApi" is a construct`
        );
      }
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when "httpApi" is a construct`
        );
      }
      this.httpApi = httpApi as apig.HttpApi;
    } else {
      const httpApiProps = (httpApi || {}) as apig.HttpApiProps;

      // Validate input
      if (httpApiProps.corsPreflight !== undefined) {
        throw new Error(
          `Cannot configure the "httpApi.corsPreflight" in the Api`
        );
      }
      if (httpApiProps.defaultDomainMapping !== undefined) {
        throw new Error(
          `Cannot configure the "httpApi.defaultDomainMapping" in the Api`
        );
      }

      const corsPreflight = this.buildCorsConfig(cors);
      const defaultDomainMapping = this.buildCustomDomainConfig(customDomain);

      this.httpApi = new apig.HttpApi(this, "Api", {
        apiName: root.logicalPrefixedName(id),
        corsPreflight,
        defaultDomainMapping,
        ...httpApiProps,
      });

      this.accessLogGroup = this.buildAccessLogConfig(accessLog);
    }

    ///////////////////////////
    // Configure routes
    ///////////////////////////

    if (routes) {
      Object.keys(routes).forEach((routeKey: string) =>
        this.addRoute(this, routeKey, routes[routeKey])
      );
    }
  }

  buildCorsConfig(
    cors: boolean | apig.CorsPreflightOptions | undefined
  ): apig.CorsPreflightOptions | undefined {
    // Handle cors: false
    if (cors === false) {
      return;
    }

    // Handle cors: true | undefined
    else if (cors === undefined || cors === true) {
      // We want CORS to allow all methods, however
      // - if we set allowMethods to ["*"], type check would fail b/c allowMethods
      //   is exptected to take an array of HttpMethod, not "*"
      // - if we set allowMethod to all allowedMethods, CloudFormation will fail
      //   b/c ANY is not acceptable.
      // So, we filter out ANY from allowedMethods. See CDK issue -
      // https://github.com/aws/aws-cdk/issues/10230
      return {
        allowHeaders: ["*"],
        allowMethods: allowedMethods.filter((m) => m !== apig.HttpMethod.ANY),
        allowOrigins: ["*"],
      };
    }

    // Handle cors: apig.CorsPreflightOptions
    else {
      return cors;
    }
  }

  buildCustomDomainConfig(
    customDomain: string | ApiCustomDomainProps | undefined
  ): apig.DomainMappingOptions | undefined {
    if (customDomain === undefined) {
      return;
    }

    // To be implemented: to allow more flexible use cases, SST should support two more use cases:
    //  1. Allow user passing in `hostedZone` object. The use case is when there are multiple
    //     HostedZones with the same domain, but one is public, and one is private.
    //  2. Allow user passing in `certificate` object. The use case is for user to create wildcard
    //     certificate or using an imported certificate.
    //  3. Allow user passing in `apigDomain` object. The use case is a user creates multiple API
    //     endpoints, and is mapping them under the same custom domain. `sst.Api` needs to expose the
    //     `apigDomain` construct created in the first Api, and lets user pass it in when creating
    //     the second Api.

    let domainName,
      hostedZone,
      hostedZoneDomain,
      certificate,
      apigDomain,
      mappingKey;

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

      // parse customDomain.domainName
      if (typeof customDomain.domainName === "string") {
        domainName = customDomain.domainName;
      } else {
        apigDomain = customDomain.domainName;

        if (customDomain.hostedZone) {
          throw new Error(
            `Cannot configure the "hostedZone" when the "domainName" is a construct`
          );
        }
        if (customDomain.certificate) {
          throw new Error(
            `Cannot configure the "certificate" when the "domainName" is a construct`
          );
        }
      }

      // parse customDomain.hostedZone
      if (!apigDomain) {
        if (!customDomain.hostedZone) {
          hostedZoneDomain = (domainName as string)
            .split(".")
            .slice(1)
            .join(".");
        } else if (typeof customDomain.hostedZone === "string") {
          hostedZoneDomain = customDomain.hostedZone;
        } else {
          hostedZone = customDomain.hostedZone;
        }
      }

      certificate = customDomain.certificate;
      mappingKey = customDomain.path;
    }

    if (!apigDomain && domainName) {
      // Look up hosted zone
      if (!hostedZone && hostedZoneDomain) {
        hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: hostedZoneDomain,
        });
      }

      if (!hostedZone) {
        throw new Error(
          `Cannot find hosted zone "${hostedZoneDomain}" in Route 53`
        );
      }

      // Create certificate
      if (!certificate) {
        certificate = new acm.Certificate(this, "Certificate", {
          domainName,
          validation: acm.CertificateValidation.fromDns(hostedZone),
        });
        this.acmCertificate = certificate;
      }

      // Create custom domain in API Gateway
      apigDomain = new apig.DomainName(this, "DomainName", {
        domainName,
        certificate,
      });
      this.apiGatewayDomain = apigDomain;

      // Create DNS record
      new route53.ARecord(this, "AliasRecord", {
        recordName: domainName,
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayv2Domain(apigDomain)
        ),
      });
    }

    return {
      domainName: apigDomain as apig.IDomainName,
      mappingKey,
    };
  }

  buildAccessLogConfig(
    accessLog:
      | boolean
      | string
      | apig.CfnStage.AccessLogSettingsProperty
      | undefined
  ): logs.LogGroup | undefined {
    if (accessLog === false) {
      return;
    }

    // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
    //       need to define it at L1 construct level.

    // create log group
    let logGroup;
    let destinationArn;
    if (
      accessLog &&
      (accessLog as apig.CfnStage.AccessLogSettingsProperty).destinationArn
    ) {
      destinationArn = (accessLog as apig.CfnStage.AccessLogSettingsProperty)
        .destinationArn;
    } else {
      logGroup = new logs.LogGroup(this, "LogGroup");
      destinationArn = logGroup.logGroupArn;
    }

    // get log format
    let format;
    if (
      accessLog &&
      (accessLog as apig.CfnStage.AccessLogSettingsProperty).format
    ) {
      format = (accessLog as apig.CfnStage.AccessLogSettingsProperty).format;
    } else if (typeof accessLog === "string") {
      format = accessLog;
    } else {
      format =
        "{" +
        [
          // request info
          `"requestTime":"$context.requestTime"`,
          `"requestId":"$context.requestId"`,
          `"httpMethod":"$context.httpMethod"`,
          `"path":"$context.path"`,
          `"routeKey":"$context.routeKey"`,
          `"status":$context.status`, // integer value, do not wrap in quotes
          `"responseLatency":$context.responseLatency`, // integer value, do not wrap in quotes
          // integration info
          `"integrationRequestId":"$context.integration.requestId"`,
          `"integrationStatus":"$context.integration.status"`,
          `"integrationLatency":"$context.integration.latency"`,
          `"integrationServiceStatus":"$context.integration.integrationStatus"`,
          // caller info
          `"ip":"$context.identity.sourceIp"`,
          `"userAgent":"$context.identity.userAgent"`,
          `"cognitoIdentityId":"$context.identity.cognitoIdentityId"`,
        ].join(",") +
        "}";
    }

    // get L1 cfnStage construct
    if (!this.httpApi.defaultStage?.node.defaultChild) {
      throw new Error(`Failed to define the default stage for Http API`);
    }

    // set access log settings
    const cfnStage = this.httpApi.defaultStage.node
      .defaultChild as apig.CfnStage;
    cfnStage.accessLogSettings = { format, destinationArn };

    return logGroup;
  }

  addRoutes(
    scope: cdk.Construct,
    routes: {
      [key: string]: FunctionDefinition | ApiRouteProps;
    }
  ): void {
    Object.keys(routes).forEach((routeKey: string) => {
      // add route
      const fn = this.addRoute(scope, routeKey, routes[routeKey]);

      // attached existing permissions
      this.permissionsAttachedForAllRoutes.forEach((permissions) =>
        fn.attachPermissions(permissions)
      );
    });
  }

  addRoute(
    scope: cdk.Construct,
    routeKey: string,
    routeValue: FunctionDefinition | ApiRouteProps
  ): Fn {
    // Normalize routeProps
    const routeProps = (this.isInstanceOfApiRouteProps(
      routeValue as ApiRouteProps
    )
      ? routeValue
      : { function: routeValue as FunctionDefinition }) as ApiRouteProps;

    // Normalize routeKey
    routeKey = this.normalizeRouteKey(routeKey);

    ///////////////////
    // Get path and method
    ///////////////////
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

    ///////////////////
    // Get authorization
    ///////////////////
    const authorizationType =
      routeProps.authorizationType ||
      this.defaultAuthorizationType ||
      ApiAuthorizationType.NONE;
    if (!Object.values(ApiAuthorizationType).includes(authorizationType)) {
      throw new Error(
        `sst.Api does not currently support ${authorizationType}. Only "AWS_IAM" and "JWT" are currently supported.`
      );
    }
    let authorizer, authorizationScopes;
    if (authorizationType === ApiAuthorizationType.JWT) {
      authorizer = routeProps.authorizer || this.defaultAuthorizer;
      authorizationScopes =
        routeProps.authorizationScopes || this.defaultAuthorizationScopes;
    }
    if (authorizationType === ApiAuthorizationType.JWT && !authorizer) {
      throw new Error(`Missing JWT authorizer for "${routeKey}"`);
    }

    ///////////////////
    // Get payload format
    ///////////////////
    const payloadFormatVersion =
      routeProps.payloadFormatVersion ||
      this.defaultPayloadFormatVersion ||
      ApiPayloadFormatVersion.V2;
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

    ///////////////////
    // Create Function
    ///////////////////
    const lambda = Fn.fromDefinition(
      scope,
      `Lambda_${methodStr}_${path}`,
      routeProps.function,
      this.defaultFunctionProps,
      `Cannot define defaultFunctionProps when a Function is passed in to the routes`
    );

    ///////////////////
    // Create route
    ///////////////////
    const route = new apig.HttpRoute(scope, `Route_${methodStr}_${path}`, {
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
        throw new Error(`Failed to define the default route for "${routeKey}"`);
      }
      const cfnRoute = route.node.defaultChild as apig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;
    }

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  isInstanceOfApiRouteProps(object: ApiRouteProps): boolean {
    return (
      object.function !== undefined || object.authorizationType !== undefined
    );
  }

  normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }

  getFunction(routeKey: string): Fn | undefined {
    return this.functions[this.normalizeRouteKey(routeKey)];
  }

  attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  attachPermissionsToRoute(routeKey: string, permissions: Permissions): void {
    const fn = this.getFunction(routeKey);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Route "${routeKey}" does not exist.`
      );
    }

    fn.attachPermissions(permissions);
  }
}
