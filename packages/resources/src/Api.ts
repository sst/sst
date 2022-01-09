import { Construct } from 'constructs';
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cfnApig from "aws-cdk-lib/aws-apigatewayv2";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";

import { App } from "./App";
import { Stack } from "./Stack";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
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
  readonly routes?: {
    [key: string]:
      | FunctionDefinition
      | ApiFunctionRouteProps
      | ApiHttpRouteProps
      | ApiAlbRouteProps;
  };
  readonly cors?: boolean | apig.CorsPreflightOptions;
  readonly accessLog?: boolean | string | ApiAccessLogProps;
  readonly customDomain?: string | ApiCustomDomainProps;

  readonly defaultFunctionProps?: FunctionProps;
  readonly defaultAuthorizationType?: ApiAuthorizationType;
  readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly defaultAuthorizationScopes?: string[];
  readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;
  readonly defaultThrottlingBurstLimit?: number;
  readonly defaultThrottlingRateLimit?: number;
  readonly stages?: Omit<apig.HttpStageProps, "httpApi">[];
}

export interface ApiFunctionRouteProps {
  readonly function: FunctionDefinition;
  readonly payloadFormatVersion?: ApiPayloadFormatVersion;
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
}

export interface ApiHttpRouteProps {
  readonly url: string;
  readonly method?: string | apig.HttpMethod;
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
}

export interface ApiAlbRouteProps {
  readonly albListener: elb.IApplicationListener;
  readonly method?: string | apig.HttpMethod;
  readonly vpcLink?: apig.IVpcLink;
  readonly authorizationType?: ApiAuthorizationType;
  readonly authorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  readonly authorizationScopes?: string[];
}

export type ApiCustomDomainProps = apigV2Domain.CustomDomainProps;
export type ApiAccessLogProps = apigV2AccessLog.AccessLogProps;

/////////////////////
// Construct
/////////////////////

export class Api extends Construct implements SSTConstruct {
  public readonly httpApi: apig.HttpApi;
  public readonly accessLogGroup?: logs.LogGroup;
  public readonly apiGatewayDomain?: apig.DomainName;
  public readonly acmCertificate?: acm.Certificate;
  private readonly _customDomainUrl?: string;
  private readonly routesData: {
    [key: string]: Fn | string | elb.IApplicationListener;
  };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly defaultAuthorizer?:
    | apigAuthorizers.HttpJwtAuthorizer
    | apigAuthorizers.HttpLambdaAuthorizer
    | apigAuthorizers.HttpUserPoolAuthorizer;
  private readonly defaultAuthorizationType?: ApiAuthorizationType;
  private readonly defaultAuthorizationScopes?: string[];
  private readonly defaultPayloadFormatVersion?: ApiPayloadFormatVersion;
  private readonly defaultThrottlingBurstLimit?: number;
  private readonly defaultThrottlingRateLimit?: number;

  constructor(scope: Construct, id: string, props?: ApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    props = props || {};
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
      defaultThrottlingBurstLimit,
      defaultThrottlingRateLimit,
    } = props;
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

    if (isCDKConstruct(httpApi)) {
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
      if (props.stages !== undefined) {
        throw new Error(
          `Cannot configure the "stages" when "httpApi" is a construct`
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
          this.apiGatewayDomain =
            customDomainData.apigDomain as apig.DomainName;
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

      const httpStage = this.httpApi.defaultStage as apig.HttpStage;

      // Configure throttling
      if (
        defaultThrottlingBurstLimit &&
        defaultThrottlingRateLimit &&
        httpStage.node.defaultChild
      ) {
        const cfnStage = httpStage.node.defaultChild as cfnApig.CfnStage;
        cfnStage.defaultRouteSettings = {
          ...(cfnStage.routeSettings || {}),
          throttlingBurstLimit: defaultThrottlingBurstLimit,
          throttlingRateLimit: defaultThrottlingRateLimit,
        };
        this.defaultThrottlingBurstLimit = defaultThrottlingBurstLimit;
        this.defaultThrottlingRateLimit = defaultThrottlingRateLimit;
      }

      // Configure access log
      for (const def of props.stages || []) {
        const stage = new apig.HttpStage(this, "Stage" + def.stageName, {
          ...def,
          httpApi: this.httpApi,
        });
        apigV2AccessLog.buildAccessLogData(this, accessLog, stage, false);
      }

      if (this.httpApi.defaultStage)
        this.accessLogGroup = apigV2AccessLog.buildAccessLogData(
          this,
          accessLog,
          this.httpApi.defaultStage as apig.HttpStage,
          true
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

  public get httpApiArn(): string {
    const stack = Stack.of(this);
    return `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.httpApi.apiId}`;
  }

  public addRoutes(
    scope: Construct,
    routes: {
      [key: string]:
        | FunctionDefinition
        | ApiFunctionRouteProps
        | ApiHttpRouteProps
        | ApiAlbRouteProps;
    }
  ): void {
    Object.keys(routes).forEach((routeKey: string) => {
      this.addRoute(scope, routeKey, routes[routeKey]);
    });
  }

  public getFunction(routeKey: string): Fn | undefined {
    const route = this.routesData[this.normalizeRouteKey(routeKey)];
    return route instanceof Fn ? route : undefined;
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

  public getConstructMetadata() {
    return {
      type: "Api" as const,
      data: {
        httpApiId: this.httpApi.apiId,
        customDomainUrl: this._customDomainUrl,
        routes: Object.entries(this.routesData).map(([key, data]) => {
          return {
            route: key,
            fn: getFunctionRef(data),
          };
        }),
      },
    };
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
    scope: Construct,
    routeKey: string,
    routeValue:
      | FunctionDefinition
      | ApiFunctionRouteProps
      | ApiHttpRouteProps
      | ApiAlbRouteProps
  ): void {
    ///////////////////
    // Normalize routeProps
    ///////////////////
    let routeProps;
    if ((routeValue as ApiAlbRouteProps).albListener) {
      routeProps = routeValue as ApiAlbRouteProps;
    } else if ((routeValue as ApiHttpRouteProps).url) {
      routeProps = routeValue as ApiHttpRouteProps;
    } else if ((routeValue as ApiFunctionRouteProps).function) {
      routeProps = routeValue as ApiFunctionRouteProps;
    } else {
      routeProps = {
        function: routeValue as FunctionDefinition,
      } as ApiFunctionRouteProps;
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
    let postfixName;
    let httpRouteKey;
    let methodStr: string;
    let path;
    if (routeKey === "$default") {
      postfixName = "default";
      httpRouteKey = apig.HttpRouteKey.DEFAULT;
      methodStr = "ANY";
      path = routeKey;
    } else {
      const routeKeyParts = routeKey.split(" ");
      if (routeKeyParts.length !== 2) {
        throw new Error(`Invalid route ${routeKey}`);
      }
      methodStr = routeKeyParts[0].toUpperCase();
      path = routeKeyParts[1];
      const method = allowedMethods.find((per) => per === methodStr);
      if (!method) {
        throw new Error(`Invalid method defined for "${routeKey}"`);
      }
      if (path.length === 0) {
        throw new Error(`Invalid path defined for "${routeKey}"`);
      }

      postfixName = `${methodStr}_${path}`;
      httpRouteKey = apig.HttpRouteKey.with(path, method);
    }

    ///////////////////
    // Get authorization
    ///////////////////
    const { authorizationType, authorizer, authorizationScopes } =
      this.buildRouteAuth(routeKey, routeProps);

    ///////////////////
    // Create route
    ///////////////////
    let integration;
    if ((routeProps as ApiAlbRouteProps).albListener) {
      routeProps = routeProps as ApiAlbRouteProps;
      integration = this.createAlbIntegration(scope, routeKey, routeProps, postfixName);
    } else if ((routeProps as ApiHttpRouteProps).url) {
      routeProps = routeProps as ApiHttpRouteProps;
      integration = this.createHttpIntegration(scope, routeKey, routeProps, postfixName);
    } else {
      routeProps = routeProps as ApiFunctionRouteProps;
      integration = this.createFunctionIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    }

    const route = new apig.HttpRoute(scope, `Route_${postfixName}`, {
      httpApi: this.httpApi,
      routeKey: httpRouteKey,
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
      const cfnRoute = route.node.defaultChild as cfnApig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;
    }
  }

  private createHttpIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiHttpRouteProps,
    postfixName: string
  ): apig.HttpRouteIntegration {
    ///////////////////
    // Create integration
    ///////////////////
    const errorMessage = `Invalid HTTP integration method defined for "${routeKey}"`;
    const integration = new apigIntegrations.HttpUrlIntegration(`Integration_${postfixName}`, routeProps.url, {
      method: this.buildHttpMethod(routeProps.method, errorMessage),
    });

    // Store route
    this.routesData[routeKey] = routeProps.url;

    return integration;
  }

  private createAlbIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiAlbRouteProps,
    postfixName: string
  ): apig.HttpRouteIntegration {
    ///////////////////
    // Create integration
    ///////////////////
    const errorMessage = `Invalid ALB integration method defined for "${routeKey}"`;
    const integration = new apigIntegrations.HttpAlbIntegration(`Integration_${postfixName}`, routeProps.albListener, {
      method: this.buildHttpMethod(routeProps.method, errorMessage),
      vpcLink: routeProps.vpcLink,
    });

    // Store route
    this.routesData[routeKey] = routeProps.albListener;

    return integration;
  }

  protected createFunctionIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps,
    postfixName: string
  ): apig.HttpRouteIntegration {
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
      `Lambda_${postfixName}`,
      routeProps.function,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaultFunctionProps" to them.`
    );
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
    // Create integration
    ///////////////////
    const integration = new apigIntegrations.HttpLambdaIntegration(`Integration_${postfixName}`, lambda, {
      payloadFormatVersion: integrationPayloadFormatVersion,
    });

    // Store route
    this.routesData[routeKey] = lambda;

    // Attached existing permissions
    this.permissionsAttachedForAllRoutes.forEach((permissions) =>
      lambda.attachPermissions(permissions)
    );

    return integration;
  }

  private buildRouteAuth(
    routeKey: string,
    routeProps: ApiFunctionRouteProps | ApiHttpRouteProps | ApiAlbRouteProps
  ) {
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

  private buildHttpMethod(
    method: string | apig.HttpMethod | undefined,
    errorMessage: string
  ): apig.HttpMethod | undefined {
    if (method === undefined) {
      return undefined;
    }

    if (typeof method === "string") {
      method = method.toUpperCase();
      method = allowedMethods.find((per) => per === method);
      if (!method) {
        throw new Error(errorMessage);
      }
    }

    return method as apig.HttpMethod;
  }
}
