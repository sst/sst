import * as cdk from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as logs from "@aws-cdk/aws-logs";

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
  readonly routes?: { [key: string]: FunctionDefinition | ApiFunctionRouteProps | ApiAlbRouteProps };
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

export interface ApiFunctionRouteProps {
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
  readonly payloadFormatVersion?: ApiPayloadFormatVersion;
  readonly function: FunctionDefinition;
}

export interface ApiAlbRouteProps {
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
  readonly albListener: elb.IApplicationListener;
  readonly method?: apig.HttpMethod;
  readonly vpcLink?: apig.IVpcLink;
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
  private readonly routesData: { [key: string]: (Fn | elb.IApplicationListener) };
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
    this.routesData = {};
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

    this.addRoutes(this, routes || {});
  }

  public get url(): string {
    return this.httpApi.apiEndpoint;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public get routes(): string[] {
    return Object.keys(this.routesData);
  }

  public addRoutes(
    scope: cdk.Construct,
    routes: {
      [key: string]: FunctionDefinition | ApiFunctionRouteProps | ApiAlbRouteProps;
    }
  ): void {
    Object.keys(routes).forEach((routeKey: string) => {
      this.addRoute(scope, routeKey, routes[routeKey]);
    });
  }

  public getFunction(routeKey: string): Fn | undefined {
    const route = this.routesData[this.normalizeRouteKey(routeKey)];
    return (route instanceof Fn) ? route : undefined;
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.routesData)
      .filter((route) => route instanceof Fn)
      .forEach((route) => (route as Fn).attachPermissions(permissions));
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
    routeValue: FunctionDefinition | ApiFunctionRouteProps | ApiAlbRouteProps
  ): void {
    ///////////////////
    // Normalize routeProps
    ///////////////////
    let routeProps;
    if ((routeValue as ApiAlbRouteProps).albListener) {
      routeProps = routeValue as ApiAlbRouteProps;
    } else if ((routeValue as ApiFunctionRouteProps).function) {
      routeProps = routeValue as ApiFunctionRouteProps;
    } else {
      routeProps = ({ function: routeValue as FunctionDefinition }) as ApiFunctionRouteProps;
    }

    ///////////////////
    // Normalize routeKey
    ///////////////////
    routeKey = this.normalizeRouteKey(routeKey);
    if (this.routesData[routeKey]) {
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
    // Create route
    ///////////////////
    let integration;
    if ((routeProps as ApiAlbRouteProps).albListener) {
      routeProps = routeProps as ApiAlbRouteProps;
      integration = this.createAlbIntegration(scope, routeKey, routeProps);
    } else {
      routeProps = routeProps as ApiFunctionRouteProps;
      integration = this.createFunctionIntegration(scope, routeKey, routeProps, methodStr, path);
    }

    const route = new apig.HttpRoute(scope, `Route_${methodStr}_${path}`, {
      httpApi: this.httpApi,
      routeKey: apig.HttpRouteKey.with(path, method),
      integration,
      authorizer,
      authorizationScopes,
    });

    ////////////////////
    // Configure route authorization type
    ////////////////////
    // Note: we need to explicitly set `cfnRoute.authorizationType` to `NONE`
    //       because if it were set to `AWS_IAM`, and then it is removed from
    //       the CloudFormation template (ie. set to undefined), CloudFormation
    //       doesn't updates the route. The route's authorizationType would still
    //       be `AWS_IAM`.
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
  }

  private createAlbIntegration(
    scope: cdk.Construct,
    routeKey: string,
    routeProps: ApiAlbRouteProps
  ): apig.IHttpRouteIntegration {
    ///////////////////
    // Create integration
    ///////////////////
    const integration = new apigIntegrations.HttpAlbIntegration({
      listener: routeProps.albListener,
      method: routeProps.method,
      vpcLink: routeProps.vpcLink,
    });

    // Store route
    this.routesData[routeKey] = routeProps.albListener;

    return integration;
  }

  private createFunctionIntegration(
    scope: cdk.Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps,
    methodStr: string,
    path: string
  ): apig.IHttpRouteIntegration {
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
    // Create integration
    ///////////////////
    const integration = new apigIntegrations.LambdaProxyIntegration({
      handler: lambda,
      payloadFormatVersion: integrationPayloadFormatVersion,
    });

    // Store route
    this.routesData[routeKey] = lambda;

    // attached existing permissions
    this.permissionsAttachedForAllRoutes.forEach((permissions) =>
      lambda.attachPermissions(permissions)
    );

    return integration;
  }

  private buildRouteAuth(routeKey: string, routeProps: ApiFunctionRouteProps | ApiAlbRouteProps) {
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

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }
}
