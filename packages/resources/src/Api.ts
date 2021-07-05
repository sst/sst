import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";
import * as apigV2Domain from "./util/apiGatewayV2Domain";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog";

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
  CUSTOM = "CUSTOM",
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
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly defaultAuthorizationScopes?: string[];
  readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;
}

export interface ApiRouteProps {
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
  readonly payloadFormatVersion?: ApiPayloadFormatVersion;
  readonly function: FunctionDefinition;
}

export type ApiCustomDomainProps = apigV2Domain.CustomDomainProps;

/////////////////////
// Construct
/////////////////////

export class Api extends cdk.Construct {
  public readonly httpApi: apig.HttpApi;
  public readonly accessLogGroup?: logs.LogGroup;
  public readonly apiGatewayDomain?: apig.DomainName;
  public readonly acmCertificate?: acm.Certificate;
  private readonly _customDomainUrl?: string;
  private readonly functions: { [key: string]: Fn };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
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

      // Handle CORS
      const corsPreflight = this.buildCorsConfig(cors);

      // Handle Custom Domain
      const customDomainData = apigV2Domain.buildCustomDomainData(
        this,
        customDomain
      );
      let defaultDomainMapping;
      if (customDomainData) {
        if (customDomainData.isApigDomainCreated) {
          this.apiGatewayDomain = customDomainData.apigDomain as apig.DomainName;
        }
        if (customDomainData.isCertificatedCreated) {
          this.acmCertificate = customDomainData.certificate as acm.Certificate;
        }
        defaultDomainMapping = {
          domainName: customDomainData.apigDomain,
          mappingKey: customDomainData.mappingKey,
        };
        this._customDomainUrl = `https://${customDomainData.url}`;
      }

      this.httpApi = new apig.HttpApi(this, "Api", {
        apiName: root.logicalPrefixedName(id),
        corsPreflight,
        defaultDomainMapping,
        ...httpApiProps,
      });

      this.accessLogGroup = apigV2AccessLog.buildAccessLogData(
        this,
        accessLog,
        this.httpApi.defaultStage as apig.HttpStage
      );
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
    return this.httpApi.apiEndpoint;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public addRoutes(
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

  public getFunction(routeKey: string): Fn | undefined {
    return this.functions[this.normalizeRouteKey(routeKey)];
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllRoutes.push(permissions);
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

  private buildCorsConfig(
    cors: boolean | apig.CorsPreflightOptions | undefined
  ): apig.CorsPreflightOptions | undefined {
    // Handle cors: false
    if (cors === false) {
      return;
    }

    // Handle cors: true | undefined
    else if (cors === undefined || cors === true) {
      return {
        allowHeaders: ["*"],
        allowMethods: [apig.CorsHttpMethod.ANY],
        allowOrigins: ["*"],
      };
    }

    // Handle cors: apig.CorsPreflightOptions
    else {
      return cors;
    }
  }

  private addRoute(
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
    // Get authorization
    ///////////////////
    const {
      authorizationType,
      authorizer,
      authorizationScopes,
    } = this.buildRouteAuth(routeKey, routeProps);

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
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaultFunctionProps" to them.`
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

  private buildRouteAuth(routeKey: string, routeProps: ApiRouteProps) {
    let authorizer, authorizationScopes;
    const authorizationType =
      routeProps.authorizationType ||
      this.defaultAuthorizationType ||
      ApiAuthorizationType.NONE;

    if (!Object.values(ApiAuthorizationType).includes(authorizationType)) {
      throw new Error(
        `sst.Api does not currently support ${authorizationType}. Only "AWS_IAM", "JWT" and "CUSTOM" are currently supported.`
      );
    }

    // Handle JWT Auth
    if (authorizationType === ApiAuthorizationType.JWT) {
      authorizer = routeProps.authorizer || this.defaultAuthorizer;
      authorizationScopes =
        routeProps.authorizationScopes || this.defaultAuthorizationScopes;
      if (!authorizer) {
        throw new Error(`Missing JWT authorizer for "${routeKey}"`);
      }
    }

    // Handle CUSTOM Auth
    else if (authorizationType === ApiAuthorizationType.CUSTOM) {
      authorizer = routeProps.authorizer || this.defaultAuthorizer;
      if (!authorizer) {
        throw new Error(`Missing custom Lambda authorizer for "${routeKey}"`);
      }
    }

    return { authorizationType, authorizer, authorizationScopes };
  }

  private isInstanceOfApiRouteProps(object: ApiRouteProps): boolean {
    return (
      object.function !== undefined || object.authorizationType !== undefined
    );
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }
}
