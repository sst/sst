import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
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
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Duration, toCdkDuration } from "./util/duration";
import { Permissions } from "./util/permission";
import * as apigV2Cors from "./util/apiGatewayV2Cors";
import * as apigV2Domain from "./util/apiGatewayV2Domain";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog";

const PayloadFormatVersions = ["1.0", "2.0"] as const;
export type ApiPayloadFormatVersion = typeof PayloadFormatVersions[number];
type ApiHttpMethod = keyof typeof apig.HttpMethod;

/////////////////////
// Interfaces
/////////////////////

export interface ApiProps<
  Authorizers extends { [key in string]: ApiAuthorizer },
  AuthorizerKeys = keyof Authorizers
> {
  cdk?: {
    httpApi?: apig.IHttpApi | apig.HttpApiProps;
    httpStages?: Omit<apig.HttpStageProps, "httpApi">[];
  };
  routes?: Record<string, ApiRouteProps<AuthorizerKeys>>;
  cors?: boolean | apigV2Cors.CorsProps;
  accessLog?: boolean | string | apigV2AccessLog.AccessLogProps;
  customDomain?: string | apigV2Domain.CustomDomainProps;
  authorizers?: Authorizers;
  defaults?: {
    functionProps?: FunctionProps;
    authorizer?: "none" | "iam" | AuthorizerKeys;
    authorizationScopes?: string[];
    payloadFormatVersion?: ApiPayloadFormatVersion;
    throttle?: {
      burst?: number;
      rate?: number;
    };
  };
}

type ApiRouteProps<AuthorizerKeys> =
  | FunctionInlineDefinition
  | ApiFunctionRouteProps<AuthorizerKeys>
  | ApiHttpRouteProps<AuthorizerKeys>
  | ApiAlbRouteProps<AuthorizerKeys>;

export interface ApiBaseRouteProps<AuthorizersKeys> {
  authorizer?: "none" | "iam" | AuthorizersKeys;
  authorizationScopes?: string[];
}

export interface ApiFunctionRouteProps<AuthorizersKeys>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type?: "function";
  function: FunctionDefinition;
  payloadFormatVersion?: ApiPayloadFormatVersion;
}

export interface ApiHttpRouteProps<AuthorizersKeys>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type: "url";
  url: string;
  cdk?: {
    integrationProps: apigIntegrations.HttpUrlIntegrationProps;
  };
}

export interface ApiAlbRouteProps<AuthorizersKeys>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type: "alb";
  cdk: {
    albListener: elb.IApplicationListener;
    integrationProps?: apigIntegrations.HttpAlbIntegrationProps;
  };
}

type ApiAuthorizer =
  | ApiUserPoolAuthorizer
  | ApiJwtAuthorizer
  | ApiLambdaAuthorizer;

export interface ApiBaseAuthorizer {
  name?: string;
  identitySource?: string[];
}

export interface ApiUserPoolAuthorizer extends ApiBaseAuthorizer {
  type: "user_pool";
  userPool?: {
    id: string;
    clientIds?: string[];
    region?: string;
  };
  cdk?: {
    authorizer: apigAuthorizers.HttpUserPoolAuthorizer;
  };
}

export interface ApiJwtAuthorizer extends ApiBaseAuthorizer {
  type: "jwt";
  jwt?: {
    issuer: string;
    audience: string[];
  };
  cdk?: {
    authorizer: apigAuthorizers.HttpJwtAuthorizer;
  };
}

export interface ApiLambdaAuthorizer extends ApiBaseAuthorizer {
  type: "lambda";
  function?: Fn;
  responseTypes?: (keyof typeof apigAuthorizers.HttpLambdaResponseType)[];
  resultsCacheTtl?: Duration;
  cdk?: {
    authorizer: apigAuthorizers.HttpLambdaAuthorizer;
  };
}

/////////////////////
// Construct
/////////////////////

export class Api<Authorizers extends { [key in string]: ApiAuthorizer }>
  extends Construct
  implements SSTConstruct
{
  public readonly cdk: {
    httpApi: apig.HttpApi;
    accessLogGroup?: logs.LogGroup;
    domainName?: apig.DomainName;
    certificate?: acm.Certificate;
  };
  private props: ApiProps<Authorizers>;
  private _customDomainUrl?: string;
  private routesData: {
    [key: string]: Fn | string | elb.IApplicationListener;
  };
  private authorizersData: Record<string, apig.IHttpRouteAuthorizer>;
  private permissionsAttachedForAllRoutes: Permissions[];

  constructor(scope: Construct, id: string, props?: ApiProps<Authorizers>) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.routesData = {};
    this.authorizersData = {};
    this.permissionsAttachedForAllRoutes = [];

    this.createHttpApi();
    this.addAuthorizers(this.props.authorizers || ({} as Authorizers));
    this.addRoutes(this, this.props.routes || {});
  }

  public get url(): string {
    return this.cdk.httpApi.apiEndpoint;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public get routes(): string[] {
    return Object.keys(this.routesData);
  }

  public get httpApiArn(): string {
    const stack = Stack.of(this);
    return `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.cdk.httpApi.apiId}`;
  }

  public addRoutes(
    scope: Construct,
    routes: Record<string, ApiRouteProps<keyof Authorizers>>
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
        graphql: false,
        url: this.cdk.httpApi.url,
        httpApiId: this.cdk.httpApi.apiId,
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

  private createHttpApi() {
    const { cdk, cors, defaults, accessLog, customDomain } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.httpApi)) {
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
      if (cdk?.httpStages !== undefined) {
        throw new Error(
          `Cannot configure the "stages" when "httpApi" is a construct`
        );
      }
      this.cdk.httpApi = cdk?.httpApi as apig.HttpApi;
    } else {
      const httpApiProps = (cdk?.httpApi || {}) as apig.HttpApiProps;

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

      // Handle Custom Domain
      const customDomainData = apigV2Domain.buildCustomDomainData(
        this,
        customDomain
      );
      let defaultDomainMapping;
      if (customDomainData) {
        if (customDomainData.isApigDomainCreated) {
          this.cdk.domainName = customDomainData.apigDomain as apig.DomainName;
        }
        if (customDomainData.isCertificatedCreated) {
          this.cdk.certificate =
            customDomainData.certificate as acm.Certificate;
        }
        defaultDomainMapping = {
          domainName: customDomainData.apigDomain,
          mappingKey: customDomainData.mappingKey,
        };
        this._customDomainUrl = `https://${customDomainData.url}`;
      }

      this.cdk.httpApi = new apig.HttpApi(this, "Api", {
        apiName: app.logicalPrefixedName(id),
        corsPreflight: apigV2Cors.buildCorsConfig(cors),
        defaultDomainMapping,
        ...httpApiProps,
      });

      const httpStage = this.cdk.httpApi.defaultStage as apig.HttpStage;

      // Configure throttling
      if (defaults?.throttle?.burst && defaults?.throttle?.rate) {
        const cfnStage = httpStage.node.defaultChild as cfnApig.CfnStage;
        cfnStage.defaultRouteSettings = {
          ...(cfnStage.routeSettings || {}),
          throttlingBurstLimit: defaults.throttle.burst,
          throttlingRateLimit: defaults.throttle.rate,
        };
      }

      // Configure access log
      for (const def of cdk?.httpStages || []) {
        const stage = new apig.HttpStage(this, "Stage" + def.stageName, {
          ...def,
          httpApi: this.cdk.httpApi,
        });
        apigV2AccessLog.buildAccessLogData(this, accessLog, stage, false);
      }

      if (this.cdk.httpApi.defaultStage)
        this.cdk.accessLogGroup = apigV2AccessLog.buildAccessLogData(
          this,
          accessLog,
          this.cdk.httpApi.defaultStage as apig.HttpStage,
          true
        );
    }
  }

  private addAuthorizers(authorizers: Authorizers) {
    Object.entries(authorizers).forEach(([key, value]) => {
      if (key === "none") {
        throw new Error(`Cannot name an authorizer "none"`);
      } else if (key === "iam") {
        throw new Error(`Cannot name an authorizer "iam"`);
      } else if (value.type === "user_pool") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.userPool) {
            throw new Error(`Missing "userPool" for "${key}" authorizer`);
          }
          const userPool = cognito.UserPool.fromUserPoolId(
            this,
            `Api-${this.node.id}-Authorizer-${key}-UserPool`,
            value.userPool.id
          );
          const userPoolClients =
            value.userPool.clientIds &&
            value.userPool.clientIds.map((clientId, i) =>
              cognito.UserPoolClient.fromUserPoolClientId(
                this,
                `Api-${this.node.id}-Authorizer-${key}-UserPoolClient-${i}`,
                clientId
              )
            );
          this.authorizersData[key] =
            new apigAuthorizers.HttpUserPoolAuthorizer(key, userPool, {
              authorizerName: value.name,
              identitySource: value.identitySource,
              userPoolClients,
              userPoolRegion: value.userPool.region,
            });
        }
      } else if (value.type === "jwt") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.jwt) {
            throw new Error(`Missing "jwt" for "${key}" authorizer`);
          }
          this.authorizersData[key] = new apigAuthorizers.HttpJwtAuthorizer(
            key,
            value.jwt.issuer,
            {
              authorizerName: value.name,
              identitySource: value.identitySource,
              jwtAudience: value.jwt.audience,
            }
          );
        }
      } else if (value.type === "lambda") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.function) {
            throw new Error(`Missing "function" for "${key}" authorizer`);
          }
          this.authorizersData[key] = new apigAuthorizers.HttpLambdaAuthorizer(
            key,
            value.function,
            {
              authorizerName: value.name,
              identitySource: value.identitySource,
              responseTypes:
                value.responseTypes &&
                value.responseTypes.map(
                  (type) => apigAuthorizers.HttpLambdaResponseType[type]
                ),
              resultsCacheTtl: value.resultsCacheTtl
                ? toCdkDuration(value.resultsCacheTtl)
                : cdk.Duration.seconds(0),
            }
          );
        }
      }
    });
  }

  private addRoute(
    scope: Construct,
    routeKey: string,
    routeValue: ApiRouteProps<keyof Authorizers>
  ): void {
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
    let method: ApiHttpMethod;
    let path;
    if (routeKey === "$default") {
      postfixName = "default";
      httpRouteKey = apig.HttpRouteKey.DEFAULT;
      method = "ANY";
      path = routeKey;
    } else {
      const routeKeyParts = routeKey.split(" ");
      if (routeKeyParts.length !== 2) {
        throw new Error(`Invalid route ${routeKey}`);
      }
      method = routeKeyParts[0].toUpperCase() as ApiHttpMethod;
      if (!apig.HttpMethod[method]) {
        throw new Error(`Invalid method defined for "${routeKey}"`);
      }
      path = routeKeyParts[1];
      if (path.length === 0) {
        throw new Error(`Invalid path defined for "${routeKey}"`);
      }

      postfixName = `${method}_${path}`;
      httpRouteKey = apig.HttpRouteKey.with(path, apig.HttpMethod[method]);
    }

    ///////////////////
    // Create route
    ///////////////////
    let integration;
    let routeProps;
    if (Fn.isInlineDefinition(routeValue)) {
      routeProps = { function: routeValue } as ApiFunctionRouteProps<
        keyof Authorizers
      >;
      integration = this.createFunctionIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    } else if (
      (routeValue as ApiAlbRouteProps<keyof Authorizers>).cdk?.albListener
    ) {
      routeProps = routeValue as ApiAlbRouteProps<keyof Authorizers>;
      integration = this.createAlbIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    } else if ((routeValue as ApiHttpRouteProps<keyof Authorizers>).url) {
      routeProps = routeValue as ApiHttpRouteProps<keyof Authorizers>;
      integration = this.createHttpIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    } else {
      (routeProps = routeValue as ApiFunctionRouteProps<keyof Authorizers>),
        (integration = this.createFunctionIntegration(
          scope,
          routeKey,
          routeProps,
          postfixName
        ));
    }

    const { authorizationType, authorizer, authorizationScopes } =
      this.buildRouteAuth(routeProps);
    const route = new apig.HttpRoute(scope, `Route_${postfixName}`, {
      httpApi: this.cdk.httpApi,
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
    const cfnRoute = route.node.defaultChild! as cfnApig.CfnRoute;
    if (authorizationType === "iam") {
      cfnRoute.authorizationType = "AWS_IAM";
    } else if (authorizationType === "none") {
      cfnRoute.authorizationType = "NONE";
    }
  }

  private createHttpIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiHttpRouteProps<keyof Authorizers>,
    postfixName: string
  ): apig.HttpRouteIntegration {
    ///////////////////
    // Create integration
    ///////////////////
    const integration = new apigIntegrations.HttpUrlIntegration(
      `Integration_${postfixName}`,
      routeProps.url,
      routeProps.cdk?.integrationProps
    );

    // Store route
    this.routesData[routeKey] = routeProps.url;

    return integration;
  }

  private createAlbIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiAlbRouteProps<keyof Authorizers>,
    postfixName: string
  ): apig.HttpRouteIntegration {
    ///////////////////
    // Create integration
    ///////////////////
    const integration = new apigIntegrations.HttpAlbIntegration(
      `Integration_${postfixName}`,
      routeProps.cdk?.albListener!,
      routeProps.cdk?.integrationProps
    );

    // Store route
    this.routesData[routeKey] = routeProps.cdk?.albListener!;

    return integration;
  }

  protected createFunctionIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps<keyof Authorizers>,
    postfixName: string
  ): apig.HttpRouteIntegration {
    ///////////////////
    // Get payload format
    ///////////////////
    const payloadFormatVersion: ApiPayloadFormatVersion =
      routeProps.payloadFormatVersion ||
      this.props.defaults?.payloadFormatVersion ||
      "2.0";
    if (!PayloadFormatVersions.includes(payloadFormatVersion)) {
      throw new Error(
        `sst.Api does not currently support ${payloadFormatVersion} payload format version. Only "V1" and "V2" are currently supported.`
      );
    }
    const integrationPayloadFormatVersion =
      payloadFormatVersion === "1.0"
        ? apig.PayloadFormatVersion.VERSION_1_0
        : apig.PayloadFormatVersion.VERSION_2_0;

    ///////////////////
    // Create Function
    ///////////////////
    const lambda = Fn.fromDefinition(
      scope,
      `Lambda_${postfixName}`,
      routeProps.function,
      this.props.defaults?.functionProps,
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
    const integration = new apigIntegrations.HttpLambdaIntegration(
      `Integration_${postfixName}`,
      lambda,
      {
        payloadFormatVersion: integrationPayloadFormatVersion,
      }
    );

    // Store route
    this.routesData[routeKey] = lambda;

    // Attached existing permissions
    this.permissionsAttachedForAllRoutes.forEach((permissions) =>
      lambda.attachPermissions(permissions)
    );

    return integration;
  }

  private buildRouteAuth(
    routeProps:
      | ApiFunctionRouteProps<keyof Authorizers>
      | ApiHttpRouteProps<keyof Authorizers>
      | ApiAlbRouteProps<keyof Authorizers>
  ) {
    const authorizerKey =
      routeProps.authorizer || this.props.defaults?.authorizer || "none";
    if (authorizerKey === "none") {
      return {
        authorizationType: "none",
        authorizer: new apig.HttpNoneAuthorizer(),
      };
    } else if (authorizerKey === "iam") {
      return {
        authorizationType: "iam",
        authorizer: new apigAuthorizers.HttpIamAuthorizer(),
      };
    }

    if (!this.props.authorizers || !this.props.authorizers[authorizerKey]) {
      throw new Error(`Cannot find authorizer "${authorizerKey}"`);
    }

    const authorizer = this.authorizersData[authorizerKey as string];
    const authorizationType = this.props.authorizers[authorizerKey].type;
    const authorizationScopes =
      authorizationType === "jwt" || authorizationType === "user_pool"
        ? routeProps.authorizationScopes ||
          this.props.defaults?.authorizationScopes
        : undefined;

    return { authorizationType, authorizer, authorizationScopes };
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }
}
