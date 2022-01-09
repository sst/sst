import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as apigV1AccessLog from "./util/apiGatewayV1AccessLog";

import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
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
  readonly routes?: {
    [key: string]: FunctionDefinition | ApiGatewayV1ApiRouteProps;
  };
  readonly cors?: boolean;
  readonly accessLog?: boolean | string | ApiGatewayV1ApiAcccessLogProps;
  readonly customDomain?: string | ApiGatewayV1ApiCustomDomainProps;
  readonly importedPaths?: { [path: string]: string };

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
  readonly endpointType?: apig.EndpointType;
  readonly mtls?: apig.MTLSConfig;
  readonly securityPolicy?: apig.SecurityPolicy;
}

export type ApiGatewayV1ApiAcccessLogProps = apigV1AccessLog.AccessLogProps;

/////////////////////
// Construct
/////////////////////

export class ApiGatewayV1Api extends Construct implements SSTConstruct {
  public readonly restApi: apig.RestApi;
  public accessLogGroup?: logs.LogGroup;
  public apiGatewayDomain?: apig.DomainName;
  public acmCertificate?: acm.Certificate | acm.DnsValidatedCertificate;
  private _deployment?: apig.Deployment;
  private _customDomainUrl?: string;
  private importedResources: { [path: string]: apig.IResource };
  private readonly functions: { [key: string]: Fn };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly defaultAuthorizer?: apig.IAuthorizer;
  private readonly defaultAuthorizationType?: apig.AuthorizationType;
  private readonly defaultAuthorizationScopes?: string[];

  constructor(scope: Construct, id: string, props?: ApiGatewayV1ApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      restApi,
      routes,
      cors,
      accessLog,
      customDomain,
      importedPaths,
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

    if (isCDKConstruct(restApi)) {
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

      // Create an API Gateway deployment resource to trigger a deployment
      this._deployment = new apig.Deployment(this, "Deployment", {
        api: this.restApi,
      });
      const cfnDeployment = this._deployment.node
        .defaultChild as apig.CfnDeployment;
      cfnDeployment.stageName = root.stage;

      if (importedPaths) {
        this.importResources(importedPaths);
      }
    } else {
      const restApiProps = (restApi || {}) as apig.RestApiProps;

      // Validate input
      if (importedPaths !== undefined) {
        throw new Error(`Cannot import route paths when creating a new API.`);
      }
      if (customDomain !== undefined && restApiProps.domainName !== undefined) {
        throw new Error(
          `Use either the "customDomain" or the "restApi.domainName" to configure the Api domain. Do not use both.`
        );
      }
      if (
        cors !== undefined &&
        restApiProps.defaultCorsPreflightOptions !== undefined
      ) {
        throw new Error(
          `Use either the "cors" or the "restApi.defaultCorsPreflightOptions" to configure the Api's CORS config. Do not use both.`
        );
      }
      if (
        accessLog !== undefined &&
        restApiProps.deployOptions?.accessLogDestination !== undefined
      ) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogDestination" to configure the Api's access log. Do not use both.`
        );
      }
      if (
        accessLog !== undefined &&
        restApiProps.deployOptions?.accessLogFormat !== undefined
      ) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogFormat" to configure the Api's access log. Do not use both.`
        );
      }

      const stageName =
        restApiProps.deployOptions?.stageName || (this.node.root as App).stage;

      const accessLogData = apigV1AccessLog.buildAccessLogData(this, accessLog);

      this.accessLogGroup = accessLogData?.logGroup;

      this.restApi = new apig.RestApi(this, "Api", {
        ...restApiProps,
        restApiName: root.logicalPrefixedName(id),
        domainName: restApiProps.domainName,
        defaultCorsPreflightOptions:
          restApiProps.defaultCorsPreflightOptions ||
          this.buildCorsConfig(cors),
        deployOptions: {
          ...(restApiProps.deployOptions || {}),
          accessLogDestination:
            restApiProps.deployOptions?.accessLogDestination ||
            accessLogData?.destination,
          accessLogFormat:
            restApiProps.deployOptions?.accessLogFormat ||
            accessLogData?.format,

          // default to the name of the sage
          stageName: stageName,

          // default to true
          tracingEnabled:
            restApiProps.deployOptions?.tracingEnabled === undefined
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

  public get url(): string {
    return this.restApi.url;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public get routes(): string[] {
    return Object.keys(this.functions);
  }

  public addRoutes(
    scope: Construct,
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

  public getConstructMetadata() {
    return {
      type: "ApiGatewayV1Api" as const,
      data: {
        customDomainUrl: this._customDomainUrl,
        restApiId: this.restApi.restApiId,
        routes: Object.entries(this.functions).map(([key, data]) => {
          return {
            route: key,
            fn: getFunctionRef(data),
          };
        }),
      },
    };
  }

  public attachPermissionsToRoute(
    routeKey: string,
    permissions: Permissions
  ): void {
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

  private createGatewayResponseForCors(cors?: boolean): void {
    if (!cors) {
      return;
    }

    this.restApi.addGatewayResponse("GatewayResponseDefault4XX", {
      type: apig.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });

    this.restApi.addGatewayResponse("GatewayResponseDefault5XX", {
      type: apig.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });
  }

  private createCustomDomain(
    customDomain?: string | ApiGatewayV1ApiCustomDomainProps
  ): void {
    // Case: customDomain is not set
    if (customDomain === undefined) {
      return;
    }

    // To be implemented: to allow more flexible use cases, SST should support 3 more use cases:
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
      // validate: customDomain is a TOKEN string
      // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
      if (cdk.Token.isUnresolved(customDomain)) {
        throw new Error(
          `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
        );
      }

      domainName = customDomain;
      this.assertDomainNameIsLowerCase(domainName);
      hostedZoneDomain = customDomain.split(".").slice(1).join(".");
    }

    // Case: customDomain.domainName not exists
    else if (!customDomain.domainName) {
      throw new Error(`Missing "domainName" in Api's customDomain setting`);
    }

    // Case: customDomain.domainName is a string
    else if (typeof customDomain.domainName === "string") {
      domainName = customDomain.domainName;

      // parse customDomain.domainName
      if (cdk.Token.isUnresolved(customDomain.domainName)) {
        // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
        // is because "hostedZone" cannot be parsed from a TOKEN value.
        if (!customDomain.hostedZone) {
          throw new Error(
            `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
          );
        }
        domainName = customDomain.domainName;
      } else {
        domainName = customDomain.domainName;
        this.assertDomainNameIsLowerCase(domainName);
      }

      // parse customDomain.hostedZone
      if (!customDomain.hostedZone) {
        hostedZoneDomain = domainName.split(".").slice(1).join(".");
      } else if (typeof customDomain.hostedZone === "string") {
        hostedZoneDomain = customDomain.hostedZone;
      } else {
        hostedZone = customDomain.hostedZone;
      }

      certificate = customDomain.certificate;
      basePath = customDomain.path;
      endpointType = customDomain.endpointType;
      mtls = customDomain.mtls;
      securityPolicy = customDomain.securityPolicy;
    }

    // Case: customDomain.domainName is a construct
    else {
      apigDomainName = customDomain.domainName;

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

      basePath = customDomain.path;
    }

    /////////////////////
    // Find hosted zone
    /////////////////////
    if (!apigDomainName && !hostedZone) {
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
        certificate = new acm.DnsValidatedCertificate(
          this,
          "CrossRegionCertificate",
          {
            domainName: domainName as string,
            hostedZone: hostedZone as route53.IHostedZone,
            region: "us-east-1",
          }
        );
      } else {
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
    if (!apigDomainName && domainName) {
      // Create custom domain in API Gateway
      apigDomainName = new apig.DomainName(this, "DomainName", {
        domainName,
        certificate: certificate as acm.ICertificate,
        endpointType,
        mtls,
        securityPolicy,
      });
      this.apiGatewayDomain = apigDomainName;

      // Create DNS record
      const record = new route53.ARecord(this, "AliasRecord", {
        recordName: domainName,
        zone: hostedZone as route53.IHostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayDomain(apigDomainName)
        ),
      });
      // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
      //       construct will append ".${hostedZoneName}" to the end of the domain.
      //       This is because the construct tries to check if the record name
      //       ends with the domain name. If not, it will append the domain name.
      //       So, we need remove this behavior.
      if (cdk.Token.isUnresolved(domainName)) {
        const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
        cfnRecord.name = domainName;
      }
    }

    /////////////////////
    // Create base mapping
    /////////////////////
    if (apigDomainName) {
      new apig.BasePathMapping(this, "BasePath", {
        domainName: apigDomainName,
        restApi: this.restApi,
        basePath,
      });
    }

    // Note: We only know the full custom domain if domainName is a string.
    //       _customDomainUrl will be undefined if apigDomainName is imported.
    if (domainName && !cdk.Token.isUnresolved(domainName)) {
      this._customDomainUrl = basePath
        ? `https://${domainName}/${basePath}/`
        : `https://${domainName}`;
    }
  }

  private importResources(resources: { [path: string]: string }): void {
    Object.keys(resources).forEach((path) => {
      const resource = apig.Resource.fromResourceAttributes(
        this,
        `Resource_${path}`,
        {
          path,
          resourceId: resources[path],
          restApi: this.restApi,
        }
      );
      this.importedResources[path] = resource;
    });
  }

  private getResourceForPath(path: string): apig.IResource {
    // Lookup exact match imported resource
    if (this.importedResources[path]) {
      return this.importedResources[path];
    }

    // Lookup parents matching imported resource first
    const parts = path.split("/");
    for (let i = parts.length; i >= 1; i--) {
      const partialPath = parts.slice(0, i).join("/");
      if (this.importedResources[partialPath]) {
        return this.importedResources[partialPath].resourceForPath(
          parts.slice(i).join("/")
        );
      }
    }

    // Not child of imported resources, create off the root
    return this.restApi.root.resourceForPath(path);
  }

  private addRoute(
    scope: Construct,
    routeKey: string,
    routeValue: FunctionDefinition | ApiGatewayV1ApiRouteProps
  ): Fn {
    // Normalize routeProps
    const routeProps = (
      this.isInstanceOfApiRouteProps(routeValue as ApiGatewayV1ApiRouteProps)
        ? routeValue
        : {
            function: routeValue as FunctionDefinition,
          }
    ) as ApiGatewayV1ApiRouteProps;

    // Normalize routeKey
    routeKey = this.normalizeRouteKey(routeKey);
    if (this.functions[routeKey]) {
      throw new Error(`A route already exists for "${routeKey}"`);
    }

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
      const parentResource = this.getResourceForPath(
        path.split("/").slice(0, -1).join("/")
      );
      resource = parentResource.addProxy({ anyMethod: false });
    } else {
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
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaultFunctionProps" to them.`
    );
    const integration = new apig.LambdaIntegration(
      lambda,
      routeProps.integrationOptions
    );
    const methodOptions = this.buildRouteMethodOptions(
      routeProps.methodOptions
    );
    const apigMethod = resource.addMethod(method, integration, methodOptions);

    // Add an environment variable to determine if the function is an Api route.
    // If it is, when "sst start" is not connected, we want to return an 500
    // status code and a descriptive error message.
    const root = scope.node.root as App;
    if (root.local) {
      lambda.addEnvironment("SST_DEBUG_IS_API_ROUTE", "1", {
        removeInEdge: true,
      });
    }

    ///////////////////
    // Handle manually created Deployment resource (ie. imported REST API)
    ///////////////////
    if (this._deployment) {
      this._deployment.addToLogicalId({ route: { routeKey, routeValue } });
      this._deployment.node.addDependency(apigMethod);
    }

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  private buildRouteMethodOptions(
    options?: apig.MethodOptions
  ): apig.MethodOptions {
    // Merge method options
    const methodOptions = {
      authorizationType: this.defaultAuthorizationType,
      ...(options || {}),
    };

    // Set authorization info
    if (
      methodOptions.authorizationType !== apig.AuthorizationType.NONE &&
      methodOptions.authorizationType !== apig.AuthorizationType.IAM
    ) {
      methodOptions.authorizer =
        methodOptions.authorizer || this.defaultAuthorizer;
      methodOptions.authorizationScopes =
        methodOptions.authorizationScopes || this.defaultAuthorizationScopes;
    }

    return methodOptions;
  }

  private isInstanceOfApiRouteProps(
    object: ApiGatewayV1ApiRouteProps
  ): boolean {
    return object.function !== undefined;
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }

  private assertDomainNameIsLowerCase(domainName: string): void {
    if (domainName !== domainName.toLowerCase()) {
      throw new Error(`The domain name needs to be in lowercase`);
    }
  }
}
