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
  Authorizers extends Record<string, ApiAuthorizer> = Record<string, never>,
  AuthorizerKeys = keyof Authorizers
> {
  cdk?: {
    /**
     * Import the underlying HTTP API or override the default configuration
     *
     * @example
     * ```js
     * import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
     *
     * new Api(this, "Api", {
     *   cdk: {
     *     httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
     *       httpApiId,
     *     }),
     *   }
     * });
     * ```
     *
     * @example
     * ```js
     * import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
     *
     * new Api({
     *   httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
     *     httpApiId,
     *   }),
     * });
     * ```
     */
    httpApi?: apig.IHttpApi | apig.HttpApiProps;
    /**
     * DOCTODO: What does this do + example
     */
    httpStages?: Omit<apig.HttpStageProps, "httpApi">[];
  };
  /**
   * Define the routes for the API. Can be a function, proxy to another API, or point to an ALB
   *
   * @example
   *
   * ```js
   * {
   *   "GET /notes"      : "src/list.main",
   *   "GET /notes/{id}" : "src/get.main",
   *   "$default": "src/default.main"
   * }
   * ```
   */
  routes?: Record<string, ApiRouteProps<AuthorizerKeys>>;

  /**
   * CORS support for all the endpoints in the API. Takes a `boolean` value or a [`cdk.aws-apigatewayv2-alpha.CorsPreflightOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.CorsPreflightOptions.html).
   * @example
   * ### Configuring CORS
   *
   * Override the default behavior of allowing all methods, and only allow the GET method.
   *
   * ```js {4-6}
   * import { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
   *
   * new Api(this, "Api", {
   *   cors: {
   *     allowMethods: [CorsHttpMethod.GET],
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   */
  cors?: boolean | apigV2Cors.CorsProps;

  /**
   * CloudWatch access logs for the API. Takes a `boolean` value, a `string` with log format, or a [`ApiAccessLogProps`](#apiaccesslogprops).
   *
   * @example
   * ### Configuring access log
   *
   * #### Configuring the log format
   *
   * Use a CSV format instead of default JSON format.
   *
   * ```js {2-3}
   * new Api(this, "Api", {
   *   accessLog:
   *     "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Configuring the log retention setting
   *
   * ```js {3}
   * new Api(this, "Api", {
   *   accessLog: {
   *     retention: "ONE_WEEK",
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   */
  accessLog?: boolean | string | apigV2AccessLog.AccessLogProps;
  /**
   *
   * The customDomain for this API. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * Takes either the domain as a string.
   *
   * ```
   * "api.domain.com"
   * ```
   *
   * Or the [ApiCustomDomainProps](#apicustomdomainprops).
   *
   * ```js
   * {
   *   domainName: "api.domain.com",
   *   hostedZone: "domain.com",
   *   path: "v1",
   * }
   * ```
   *
   * Note that, SST automatically creates a Route 53 A record in the hosted zone to point the custom domain to the API Gateway domain.
   *
   * @example
   * ### Configuring custom domains
   * You can configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   * #### Using the basic config
   *
   * ```js {2}
   * new Api(this, "Api", {
   *   customDomain: "api.domain.com",
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Configuring with a wildcard
   *
   * ```js {2}
   * new Api(this, "Api", {
   *   customDomain: "*.domain.com",
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Using the full config
   *
   * ```js {2-6}
   * new Api(this, "Api", {
   *   customDomain: {
   *     domainName: "api.domain.com",
   *     hostedZone: "domain.com",
   *     path: "v1",
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Mapping multiple APIs to the same domain
   *
   * ```js {9-12}
   * const usersApi = new Api(this, "UsersApi", {
   *   customDomain: {
   *     domainName: "api.domain.com",
   *     path: "users",
   *   },
   * });
   *
   * new Api(this, "PostsApi", {
   *   customDomain: {
   *     domainName: usersApi.apiGatewayDomain,
   *     path: "posts",
   *   },
   * });
   * ```
   *
   * #### Importing an existing API Gateway custom domain
   *
   * ```js {5-9}
   * import { DomainName } from "@aws-cdk/aws-apigatewayv2-alpha";
   *
   * new Api(this, "Api", {
   *   customDomain: {
   *     domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
   *       name,
   *       regionalDomainName,
   *       regionalHostedZoneId,
   *     }),
   *     path: "newPath",
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Importing an existing certificate
   *
   * ```js {6}
   * import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
   *
   * new Api(this, "Api", {
   *   customDomain: {
   *     domainName: "api.domain.com",
   *     certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Specifying a hosted zone
   *
   * If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.
   *
   * ```js {6-9}
   * import { HostedZone } from "aws-cdk-lib/aws-route53";
   *
   * new Api(this, "Api", {
   *   customDomain: {
   *     domainName: "api.domain.com",
   *     hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
   *       hostedZoneId,
   *       zoneName,
   *     }),
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * #### Loading domain name from SSM parameter
   *
   * If you have the domain name stored in AWS SSM Parameter Store, you can reference the value as the domain name:
   *
   * ```js {3,6-9}
   * import { StringParameter } from "aws-cdk-lib/aws-ssm";
   *
   * const rootDomain = StringParameter.valueForStringParameter(this, `/myApp/domain`);
   *
   * new Api(this, "Api", {
   *   customDomain: {
   *     domainName: `api.${rootDomain}`,
   *     hostedZone: rootDomain,
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * Note that, normally SST will look for a hosted zone by stripping out the first part of the `domainName`. But this is not possible when the `domainName` is a reference. Since its value will be resolved at deploy time. So you'll need to specify the `hostedZone` explicitly.
   *
   * #### Using externally hosted domain
   *
   * ```js {4-8}
   * import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
   *
   * new Api(this, "Api", {
   *   customDomain: {
   *     isExternalDomain: true,
   *     domainName: "api.domain.com",
   *     certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
   *   },
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   * ```
   *
   * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   */
  customDomain?: string | apigV2Domain.CustomDomainProps;
  authorizers?: Authorizers;

  /**
   * Configure various defaults to be applied accross all routes
   */
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the API. If the function is specified for a route, these default values are overridden. Except for the environment, the layers, and the permissions properties, that will be merged.
     *
     * @example
     * ### Specifying function props for all the routes
     *
     * You can extend the minimal config, to set some function props and have them apply to all the routes.
     *
     * ```js {2-6}
     * new Api(this, "Api", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     }
     *   },
     *   routes: {
     *     "GET  /notes": "src/list.main",
     *     "POST /notes": "src/create.main",
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
    authorizer?:
      | "none"
      | "iam"
      | (string extends AuthorizerKeys ? never : AuthorizerKeys);
    /**
     * An array of scopes to include in the authorization for a specific route. Defaults to [`defaultAuthorizationScopes`](#defaultauthorizationscopes). If both `defaultAuthorizationScopes` and `authorizationScopes` are configured, `authorizationScopes` is used. Instead of the union of both.
     */
    authorizationScopes?: string[];
    /**
     * The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to 2.0, `ApiPayloadFormatVersion.V2`.
     */
    payloadFormatVersion?: ApiPayloadFormatVersion;
    /**
     * Default throttling rate limits for all methods in this API.
     *
     * @example
     * ### Configuring throttling
     *
     *
     * ```js {3-4}
     * new Api(this, "Api", {
     *   throttle: {
     *     rate: 2000,
     *     burst: 100,
     *   },
     *   routes: {
     *     "GET  /notes": "list.main",
     *     "POST /notes": "create.main",
     *   },
     * });
     * ```
     */
    throttle?: {
      /**
       * The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
       */
      burst?: number;
      /**
       * The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
       */
      rate?: number;
    };
  };
}

export type ApiRouteProps<AuthorizerKeys> =
  | FunctionInlineDefinition
  | ApiFunctionRouteProps<AuthorizerKeys>
  | ApiHttpRouteProps<AuthorizerKeys>
  | ApiAlbRouteProps<AuthorizerKeys>;

interface ApiBaseRouteProps<AuthorizersKeys = never> {
  authorizer?:
    | "none"
    | "iam"
    | (string extends AuthorizersKeys ? never : AuthorizersKeys);
  authorizationScopes?: string[];
}

/**
 * Specify a function route handler and configure additional options
 *
 * @example
 * ```js
 * api.addRoutes(this, {
 *   "GET /notes/{id}": {
 *     type: "function",
 *     function: "src/get.main",
 *     payloadFormatVersion: "1.0",
 *   }
 * });
 * ```
 */
export interface ApiFunctionRouteProps<AuthorizersKeys = never>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type?: "function";
  /**
   *The function definition used to create the function for this route.
   */
  function: FunctionDefinition;
  /**
   * The payload format version for the route.
   *
   * @default "2.0"
   */
  payloadFormatVersion?: ApiPayloadFormatVersion;
}

/**
 * Specify a route handler that forwards to another URL
 *
 * @example
 * ```js
 * api.addRoutes(this, {
 *   "GET /notes/{id}": {
 *     type: "url",
 *     url: "https://example.com/notes/{id}",
 *   }
 * });
 * ```
 */
export interface ApiHttpRouteProps<AuthorizersKeys>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  /**
   * This is a constant
   */
  type: "url";
  /**
   * The URL to forward to
   */
  url: string;
  cdk?: {
    /**
     * Override the underlying CDK integration
     */
    integration: apigIntegrations.HttpUrlIntegrationProps;
  };
}

export interface ApiAlbRouteProps<AuthorizersKeys>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type: "alb";
  cdk: {
    /**
     * The listener to the application load balancer used for the integration.
     */
    albListener: elb.IApplicationListener;
    integration?: apigIntegrations.HttpAlbIntegrationProps;
  };
}

type ApiAuthorizer =
  | ApiUserPoolAuthorizer
  | ApiJwtAuthorizer
  | ApiLambdaAuthorizer;

interface ApiBaseAuthorizer {
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

/**
 * The Api construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains.
 *
 * @example
 * The `Api` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.
 *
 * ### Using the minimal config
 *
 * ```ts
 * import { Api } from "@serverless-stack/resources";
 *
 * new Api(this, "Api", {
 *   routes: {
 *     "GET    /notes": "src/list.main",
 *     "POST   /notes": "src/create.main",
 *     "GET    /notes/{id}": "src/get.main",
 *     "PUT    /notes/{id}": "src/update.main",
 *     "DELETE /notes/{id}": "src/delete.main",
 *   },
 * });
 * ```
 */
export class Api<
    Authorizers extends Record<string, ApiAuthorizer> = Record<string, never>
  >
  extends Construct
  implements SSTConstruct
{
  public readonly cdk: {
    /**
     * The internally created CDK HttpApi instance.
     */
    httpApi: apig.HttpApi;
    /**
     * If access logs are enabled, this is the internally created CDK LogGroup instance.
     */
    accessLogGroup?: logs.LogGroup;
    /**
     * If custom domain is enabled, this is the internally created CDK DomainName instance.
     */
    domainName?: apig.DomainName;
    /**
     * If custom domain is enabled, this is the internally created CDK Certificate instance.
     */
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

  /**
   * The URL of the Api.
   */
  public get url(): string {
    return this.cdk.httpApi.apiEndpoint;
  }

  /**
   * If custom domain is enabled, this is the custom domain URL of the Api.
   *
   * :::note
   * If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
   * :::
   */
  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  /**
   * The routes for the Api
   */
  public get routes(): string[] {
    return Object.keys(this.routesData);
  }

  public get httpApiArn(): string {
    const stack = Stack.of(this);
    return `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.cdk.httpApi.apiId}`;
  }

  /**
   * Adds routes to the Api after it has been created. Specify an object with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`ApiFunctionRouteProps`](#apifunctionrouteprops).
   *
   * @example
   * ```js
   * // Example Two
   * api.addRoutes(this, {
   *   "GET    /notes/{id}": "src/get.main",
   *   "PUT    /notes/{id}": "src/update.main",
   *   "DELETE /notes/{id}": "src/delete.main",
   * });
   * ```
   */
  public addRoutes(
    scope: Construct,
    routes: Record<string, ApiRouteProps<keyof Authorizers>>
  ): void {
    Object.keys(routes).forEach((routeKey: string) => {
      this.addRoute(scope, routeKey, routes[routeKey]);
    });
  }

  /**
   * Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.
   * @example
   * ### Getting the function for a route
   *
   * ```js {11}
   * const api = new Api(this, "Api", {
   *   routes: {
   *     "GET    /notes": "src/list.main",
   *     "POST   /notes": "src/create.main",
   *     "GET    /notes/{id}": "src/get.main",
   *     "PUT    /notes/{id}": "src/update.main",
   *     "DELETE /notes/{id}": "src/delete.main",
   *   },
   * });
   *
   * const listFunction = api.getFunction("GET /notes");
   * ```
   */
  public getFunction(routeKey: string): Fn | undefined {
    const route = this.routesData[this.normalizeRouteKey(routeKey)];
    return route instanceof Fn ? route : undefined;
  }

  /**
   * Attaches the given list of [permissions](../util/Permissions.md) to all the routes. This allows the functions to access other AWS resources.
   *
   * Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).
   *
   * @example
   * ### Permissions for all routes
   *
   * Allow the entire API to access S3.
   *
   * ```js {10}
   * const api = new Api(this, "Api", {
   *   routes: {
   *     "GET    /notes": "src/list.main",
   *     "POST   /notes": "src/create.main",
   *     "GET    /notes/{id}": "src/get.main",
   *     "PUT    /notes/{id}": "src/update.main",
   *     "DELETE /notes/{id}": "src/delete.main",
   *   },
   * });
   * api.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    Object.values(this.routesData)
      .filter((route) => route instanceof Fn)
      .forEach((route) => (route as Fn).attachPermissions(permissions));
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  /**
   * Attaches the given list of [permissions](../util/Permissions.md) to a specific route. This allows that function to access other AWS resources.
   * Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).
   * @example
   * ### Permissions for a specific route
   *
   * Allow one of the routes to access S3.
   *
   * ```js {11}
   * const api = new Api(this, "Api", {
   *   routes: {
   *     "GET    /notes": "src/list.main",
   *     "POST   /notes": "src/create.main",
   *     "GET    /notes/{id}": "src/get.main",
   *     "PUT    /notes/{id}": "src/update.main",
   *     "DELETE /notes/{id}": "src/delete.main",
   *   },
   * });
   *
   * api.attachPermissionsToRoute("GET /notes", ["s3"]);
   * ```
   *
   */
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
      routeProps.cdk?.integration
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
      routeProps.cdk?.integration
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
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaults.function" to them.`
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
