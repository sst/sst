import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigateway";

import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

const allowedMethods = [
  "ANY",
  "GET",
  "PUT",
  "POST",
  "HEAD",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

/////////////////////
// Interfaces
/////////////////////

export interface ApiGatewayV1ApiProps {
  readonly restApi?: apig.IRestApi | apig.RestApiProps;
  readonly routes?: { [key: string]: FunctionDefinition | ApiGatewayV1ApiRouteProps };
  readonly cors?: boolean;
  readonly accessLog?: boolean | string;
  readonly customDomain?: string | ApiGatewayV1ApiCustomDomainProps;
  readonly importedRoutePaths?: { [path: string]: string };

  readonly defaultFunctionProps?: FunctionProps;
  readonly defaultAuthorizer?: apig.IAuthorizer;
  readonly defaultAuthorizationType?: apig.AuthorizationType;
  readonly defaultAuthorizationScopes?: string[];
}

export interface ApiGatewayV1ApiRouteProps {
  readonly function: FunctionDefinition;
  readonly methodOptions?: apig.MethodOptions;
  readonly integrationOptions?: apig.LambdaIntegrationOptions;
}

export interface ApiGatewayV1ApiCustomDomainProps {
  readonly domainName: string | apig.IDomainName;
  readonly hostedZone?: string | route53.IHostedZone;
  readonly certificate?: acm.ICertificate;
  readonly path?: string;
  readonly endpointType?: apig.EndpointType,
  readonly mtls?: apig.MTLSConfig;
  readonly securityPolicy?: apig.SecurityPolicy;
}

/////////////////////
// Construct
/////////////////////

export class ApiGatewayV1Api extends cdk.Construct {
  public readonly restApi: apig.RestApi;
  public accessLogGroup?: logs.LogGroup;
  public apiGatewayDomain?: apig.DomainName;
  public acmCertificate?: acm.Certificate | acm.DnsValidatedCertificate;
  private importedResources: { [path: string]: apig.IResource };
  private readonly functions: { [key: string]: Fn };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly defaultAuthorizer?: apig.IAuthorizer;
  private readonly defaultAuthorizationType?: apig.AuthorizationType;
  private readonly defaultAuthorizationScopes?: string[];

  constructor(scope: cdk.Construct, id: string, props?: ApiGatewayV1ApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      restApi,
      routes,
      cors,
      accessLog,
      customDomain,
      importedRoutePaths,
      defaultFunctionProps,
      defaultAuthorizer,
      defaultAuthorizationType,
      defaultAuthorizationScopes,
    } = props || {};
    this.functions = {};
    this.importedResources = {};
    this.permissionsAttachedForAllRoutes = [];
    this.defaultFunctionProps = defaultFunctionProps;
    this.defaultAuthorizer = defaultAuthorizer;
    this.defaultAuthorizationType = defaultAuthorizationType;
    this.defaultAuthorizationScopes = defaultAuthorizationScopes;

    ////////////////////
    // Create Api
    ////////////////////

    if (cdk.Construct.isConstruct(restApi)) {
      if (cors !== undefined) {
        throw new Error(
          `Cannot configure the "cors" when the "restApi" is imported`
        );
      }
      if (accessLog !== undefined) {
        throw new Error(
          `Cannot configure the "accessLog" when the "restApi" is imported`
        );
      }
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when the "restApi" is imported`
        );
      }
      this.restApi = restApi as apig.RestApi;

      if (importedRoutePaths) {
        this.importResources(importedRoutePaths);
      }
    } else {
      const restApiProps = (restApi || {}) as apig.RestApiProps;

      // Validate input
      if (importedRoutePaths !== undefined) {
        throw new Error(
          `Cannot import route paths when creating a new API.`
        );
      }
      if (customDomain !== undefined && restApiProps.domainName !== undefined) {
        throw new Error(
          `Use either the "customDomain" or the "restApi.domainName" to configure the Api domain. Do not use both.`
        );
      }
      if (cors !== undefined && restApiProps.defaultCorsPreflightOptions !== undefined) {
        throw new Error(
          `Use either the "cors" or the "restApi.defaultCorsPreflightOptions" to configure the Api's CORS config. Do not use both.`
        );
      }
      if (accessLog !== undefined && restApiProps.deployOptions?.accessLogDestination !== undefined) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogDestination" to configure the Api's access log. Do not use both.`
        );
      }
      if (accessLog !== undefined && restApiProps.deployOptions?.accessLogFormat !== undefined) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogFormat" to configure the Api's access log. Do not use both.`
        );
      }

      this.restApi = new apig.RestApi(this, "Api", {
        ...restApiProps,
        restApiName: root.logicalPrefixedName(id),
        domainName: restApiProps.domainName,
        defaultCorsPreflightOptions: restApiProps.defaultCorsPreflightOptions || this.buildCorsConfig(cors),
        deployOptions: {
          ...(restApiProps.deployOptions || {}),
          accessLogDestination: restApiProps.deployOptions?.accessLogDestination || this.buildAccessLogDestination(accessLog),
          accessLogFormat: restApiProps.deployOptions?.accessLogFormat || this.buildAccessLogFormat(accessLog),

          // default to the name of the sage
          stageName: restApiProps.deployOptions?.stageName || (this.node.root as App).stage,

          // default to true
          tracingEnabled: restApiProps.deployOptions?.tracingEnabled === undefined
            ? true
            : restApiProps.deployOptions?.tracingEnabled,
        },
      });

      this.createCustomDomain(customDomain);
      this.createGatewayResponseForCors(cors);
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

  public addRoutes(
    scope: cdk.Construct,
    routes: {
      [key: string]: FunctionDefinition | ApiGatewayV1ApiRouteProps;
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

  public getFunction(routeKey: string): Fn | undefined {
    return this.functions[this.normalizeRouteKey(routeKey)];
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  public attachPermissionsToRoute(routeKey: string, permissions: Permissions): void {
    const fn = this.getFunction(routeKey);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Route "${routeKey}" does not exist.`
      );
    }

    fn.attachPermissions(permissions);
  }

  private buildCorsConfig(cors?: boolean): apig.CorsOptions | undefined {
    // Case: cors is false
    if (cors === false) {
      return undefined;
    }

    // Case: cors is true or undefined
    return {
      allowOrigins: apig.Cors.ALL_ORIGINS,
    } as apig.CorsOptions;
  }

  private buildAccessLogDestination(accessLog?: boolean | string): apig.IAccessLogDestination | undefined {
    // Case: accessLog is false
    if (accessLog === false) {
      return undefined;
    }

    // Case: accessLog is true or undefined
    this.accessLogGroup = new logs.LogGroup(this, "LogGroup");
    return new apig.LogGroupLogDestination(this.accessLogGroup);
  }

  private buildAccessLogFormat(accessLog?: boolean | string): apig.AccessLogFormat | undefined {
    // Case: accessLog is false
    if (accessLog === false) {
      return undefined;
    }

    // Case: accessLog is string
    if (typeof accessLog === "string") {
      return apig.AccessLogFormat.custom(accessLog);
    }

    // Case: accessLog is true or undefined
    return apig.AccessLogFormat.custom('{' + [
      `"requestTime":"$context.requestTime"`,
      `"requestId":"$context.requestId"`,
      `"httpMethod":"$context.httpMethod"`,
      `"path":"$context.path"`,
      `"resourcePath":"$context.resourcePath"`,
      `"status":$context.status`, // integer value, do not wrap in quotes
      `"responseLatency":$context.responseLatency`, // integer value, do not wrap in quotes
      `"xrayTraceId":"$context.xrayTraceId"`,
      // integration info
      `"integrationRequestId":"$context.integration.requestId"`,
      `"functionResponseStatus":"$context.integration.status"`,
      `"integrationLatency":"$context.integration.latency"`,
      `"integrationServiceStatus":"$context.integration.integrationStatus"`,
      // caller info
      `"ip":"$context.identity.sourceIp"`,
      `"userAgent":"$context.identity.userAgent"`,
      `"principalId":"$context.authorizer.principalId"`,
    ].join(",") + '}');
  }

  private createGatewayResponseForCors(cors?: boolean): void {
    if (!cors) { return; }

    this.restApi.addGatewayResponse('GatewayResponseDefault4XX', {
      type: apig.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'"
      },
    });

    this.restApi.addGatewayResponse('GatewayResponseDefault5XX', {
      type: apig.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'"
      },
    });
  }

  private createCustomDomain(customDomain?: string | ApiGatewayV1ApiCustomDomainProps): void {
    // Case: customDomain is not set
    if (customDomain === undefined) { return; }

    // To be implemented: to allow more flexible use cases, SST should support two more use cases:
    //  1. Allow user passing in `hostedZone` object. The use case is when there are multiple
    //     HostedZones with the same domain, but one is public, and one is private.
    //  2. Allow user passing in `certificate` object. The use case is for user to create wildcard
    //     certificate or using an imported certificate.
    //  3. Allow user passing in `apigDomainName` object. The use case is a user creates multiple API
    //     endpoints, and is mapping them under the same custom domain. `sst.Api` needs to expose the
    //     `apigDomainName` construct created in the first Api, and lets user pass it in when creating
    //     the second Api.

    let domainName,
      hostedZone,
      hostedZoneDomain,
      certificate,
      apigDomainName,
      basePath,
      endpointType,
      mtls,
      securityPolicy;

    /////////////////////
    // Parse input
    /////////////////////

    // Case: customDomain is a string
    if (typeof customDomain === "string") {
      domainName = customDomain;
      hostedZoneDomain = customDomain.split(".").slice(1).join(".");
    }
    // Case: customDomain is an object
    else {
      // customDomain.domainName is not defined
      if (!customDomain.domainName) {
        throw new Error(
          `Missing "domainName" in Api's customDomain setting`
        );
      }

      // parse customDomain.domainName
      if (typeof customDomain.domainName === "string") {
        domainName = customDomain.domainName;
      }
      else {
        apigDomainName = customDomain.domainName;
      }

      // customDomain.domainName is imported
      if (apigDomainName && customDomain.hostedZone) {
        throw new Error(
          `Cannot configure the "hostedZone" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.certificate) {
        throw new Error(
          `Cannot configure the "certificate" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.endpointType) {
        throw new Error(
          `Cannot configure the "endpointType" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.mtls) {
        throw new Error(
          `Cannot configure the "mtls" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.securityPolicy) {
        throw new Error(
          `Cannot configure the "securityPolicy" when the "domainName" is a construct`
        );
      }

      // parse customDomain.hostedZone
      if (typeof customDomain.hostedZone === "string") {
        hostedZoneDomain = customDomain.hostedZone;
      }
      else {
        hostedZone = customDomain.hostedZone;
      }

      certificate = customDomain.certificate;
      basePath = customDomain.path;
      endpointType = customDomain.endpointType;
      mtls = customDomain.mtls;
      securityPolicy = customDomain.securityPolicy;
    }

    /////////////////////
    // Find hosted zone
    /////////////////////
    if (!apigDomainName && !hostedZone) {
      // parse hosted zone domain from domain name
      if (!hostedZoneDomain) {
        hostedZoneDomain = (domainName as string)
          .split(".")
          .slice(1)
          .join(".");
      }

      // Look up hosted zone
      if (!hostedZone && hostedZoneDomain) {
        hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: hostedZoneDomain,
        });
      }
    }
      
    /////////////////////
    // Create certificate
    /////////////////////
    if (!apigDomainName && !certificate) {
      if (endpointType === apig.EndpointType.EDGE) {
        certificate = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
          domainName: domainName as string,
          hostedZone: hostedZone as route53.IHostedZone,
          region: 'us-east-1',
        });
      }
      else {
        certificate = new acm.Certificate(this, "Certificate", {
          domainName: domainName as string,
          validation: acm.CertificateValidation.fromDns(hostedZone),
        });
      }
      this.acmCertificate = certificate;
    }

    /////////////////////
    // Create API Gateway domain name
    /////////////////////
    if (!apigDomainName) {
      // Create custom domain in API Gateway
      apigDomainName = new apig.DomainName(this, "DomainName", {
        domainName: domainName as string,
        certificate: certificate as acm.ICertificate,
        endpointType,
        mtls,
        securityPolicy,
      });
      this.apiGatewayDomain = apigDomainName;

      // Create DNS record
      new route53.ARecord(this, "AliasRecord", {
        recordName: domainName,
        zone: hostedZone as route53.IHostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayDomain(apigDomainName)
        ),
      });
    }

    /////////////////////
    // Create base mapping
    /////////////////////
    new apig.BasePathMapping(this, "BasePath", {
      domainName: apigDomainName,
      restApi: this.restApi,
      basePath,
    });
  }

  private importResources(resources: { [path: string]: string }): void {
    Object.keys(resources).forEach(path => {
      const resource = apig.Resource.fromResourceAttributes(this, `Resource_${path}`, {
        path,
        resourceId: resources[path],
        restApi: this.restApi,
      });
      this.importedResources[path] = resource;
    });
  }

  private getResourceForPath(path: string ): apig.IResource {
    // Lookup exact match imported resource
    if (this.importedResources[path]) {
      return this.importedResources[path];
    }

    // Lookup parents matching imported resource first
    const parts = path.split("/");
    for (let i = parts.length; i >=1; i--) {
      const partialPath = parts.slice(0, i).join("/");
      if (this.importedResources[partialPath]) {
        return this.importedResources[partialPath].resourceForPath(parts.slice(i).join("/"));
      }
    }

    // Not child of imported resources, create off the root
    return this.restApi.root.resourceForPath(path);
  }

  private addRoute(
    scope: cdk.Construct,
    routeKey: string,
    routeValue: FunctionDefinition | ApiGatewayV1ApiRouteProps
  ): Fn {
    // Normalize routeProps
    const routeProps = (this.isInstanceOfApiRouteProps(
      routeValue as ApiGatewayV1ApiRouteProps
    )
      ? routeValue
      : { function: routeValue as FunctionDefinition }) as ApiGatewayV1ApiRouteProps;

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
    // Create Resources
    ///////////////////
    let resource;
    if (path.endsWith("/{proxy+}")) {
      const parentResource = this.getResourceForPath(path.split("/").slice(0, -1).join("/"));
      resource = parentResource.addProxy({ anyMethod: false });
    }
    else {
      resource = this.getResourceForPath(path);
    }

    ///////////////////
    // Create Method
    ///////////////////
    const lambda = Fn.fromDefinition(
      scope,
      `Lambda_${methodStr}_${path}`,
      routeProps.function,
      this.defaultFunctionProps,
      `Cannot define defaultFunctionProps when a Function is passed in to the routes`
    );
    const integration = new apig.LambdaIntegration(lambda, routeProps.integrationOptions);
    const methodOptions = this.buildRouteMethodOptions(routeProps.methodOptions);
    resource.addMethod(method, integration, methodOptions);

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  private buildRouteMethodOptions(options?: apig.MethodOptions): apig.MethodOptions {
    return {
      authorizer: this.defaultAuthorizer,
      authorizationType: this.defaultAuthorizationType,
      authorizationScopes: this.defaultAuthorizationScopes,
      ...(options || {}),
    };
  }

  private isInstanceOfApiRouteProps(object: ApiGatewayV1ApiRouteProps): boolean {
    return (
      object.function !== undefined
    );
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }
}
