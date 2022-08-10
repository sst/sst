import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cfnApig from "aws-cdk-lib/aws-apigatewayv2";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions } from "./util/permission.js";
import * as apigV2Cors from "./util/apiGatewayV2Cors.js";
import * as apigV2Domain from "./util/apiGatewayV2Domain.js";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog.js";

const PayloadFormatVersions = ["1.0", "2.0"] as const;
export type ApiPayloadFormatVersion = typeof PayloadFormatVersions[number];
type ApiHttpMethod = keyof typeof apig.HttpMethod;

/////////////////////
// Interfaces
/////////////////////

export type ApiAuthorizer =
  | ApiUserPoolAuthorizer
  | ApiJwtAuthorizer
  | ApiLambdaAuthorizer;

interface ApiBaseAuthorizer {
  /**
   * The name of the authorizer.
   */
  name?: string;
  /**
   * The identity source for which authorization is requested.
   * @default `["$request.header.Authorization"]`
   */
  identitySource?: string[];
}

/**
 * Specify a user pool authorizer and configure additional options.
 *
 * @example
 * ```js
 * new Api(stack, "Api", {
 *   authorizers: {
 *     Authorizer: {
 *       type: "user_pool",
 *       userPool: {
 *         id: userPool.userPoolId,
 *         clientIds: [userPoolClient.userPoolClientId],
 *       },
 *     },
 *   },
 * });
 * ```
 */
export interface ApiUserPoolAuthorizer extends ApiBaseAuthorizer {
  /**
   * String li any shot and having even a miniscule shotteral to signify that the authorizer is user pool authorizer.
   */
  type: "user_pool";
  userPool?: {
    /**
     * The id of the user pool to use for authorization.
     */
    id: string;
    /**
     * The ids of the user pool clients to use for authorization.
     */
    clientIds?: string[];
    /**
     * The AWS region of the user pool.
     */
    region?: string;
  };
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer: apigAuthorizers.HttpUserPoolAuthorizer;
  };
}

/**
 * Specify a JWT authorizer and configure additional options.
 *
 * @example
 * ```js
 * new Api(stack, "Api", {
 *   authorizers: {
 *     Authorizer: {
 *       type: "jwt",
 *       userPool: {
 *         issuer: "https://abc.us.auth0.com",
 *         audience: ["123"],
 *       },
 *     },
 *   },
 * });
 * ```
 */
export interface ApiJwtAuthorizer extends ApiBaseAuthorizer {
  /**
   * String literal to signify that the authorizer is JWT authorizer.
   */
  type: "jwt";
  jwt?: {
    /**
     * The base domain of the identity provider that issues JWT.
     */
    issuer: string;
    /**
     * A list of the intended recipients of the JWT.
     */
    audience: string[];
  };
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer: apigAuthorizers.HttpJwtAuthorizer;
  };
}

/**
 * Specify a Lambda authorizer and configure additional options.
 *
 * @example
 * ```js
 * new Api(stack, "Api", {
 *   authorizers: {
 *     Authorizer: {
 *       type: "lambda",
 *       function: new Function(stack, "Authorizer", {
 *         handler: "test/lambda.handler",
 *       }),
 *     },
 *   },
 * });
 * ```
 */
export interface ApiLambdaAuthorizer extends ApiBaseAuthorizer {
  /**
   * String literal to signify that the authorizer is Lambda authorizer.
   */
  type: "lambda";
  /**
   * Used to create the authorizer function
   */
  function?: Fn;
  /**
   * The types of responses the lambda can return.
   *
   * If `simple` is included then response format 2.0 will be used.
   * @default ["iam"]
   */
  responseTypes?: Lowercase<
    keyof typeof apigAuthorizers.HttpLambdaResponseType
  >[];
  /**
   * The amount of time the results are cached.
   * @default Not cached
   */
  resultsCacheTtl?: Duration;
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer: apigAuthorizers.HttpLambdaAuthorizer;
  };
}

export interface ApiCorsProps extends apigV2Cors.CorsProps {}
export interface ApiDomainProps extends apigV2Domain.CustomDomainProps {}
export interface ApiAccessLogProps extends apigV2AccessLog.AccessLogProps {}

export interface ApiProps<
  Authorizers extends Record<string, ApiAuthorizer> = Record<
    string,
    ApiAuthorizer
  >,
  AuthorizerKeys = keyof Authorizers
> {
  /**
   * Define the routes for the API. Can be a function, proxy to another API, or point to an ALB
   *
   * @example
   *
   * ```js
   * new Api(stack, "api", {
   *   routes: {
   *     "GET /notes"      : "src/list.main",
   *     "GET /notes/{id}" : "src/get.main",
   *     "$default": "src/default.main"
   *   }
   * })
   * ```
   */
  routes?: Record<string, ApiRouteProps<AuthorizerKeys>>;
  /**
   * CORS support applied to all endpoints in this API
   *
   * @default true
   *
   * @example
   *
   * ```js
   * new Api(stack, "Api", {
   *   cors: {
   *     allowMethods: ["GET"],
   *   },
   * });
   * ```
   *
   */
  cors?: boolean | ApiCorsProps;
  /**
   * Enable CloudWatch access logs for this API
   *
   * @default true
   *
   * @example
   * ```js
   * new Api(stack, "Api", {
   *   accessLog: true
   * });
   * ```
   *
   * ```js
   * new Api(stack, "Api", {
   *   accessLog: {
   *     retention: "one_week",
   *   },
   * });
   * ```
   */
  accessLog?: boolean | string | ApiAccessLogProps;
  /**
   * Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)
   *
   * @example
   * ```js
   * new Api(stack, "Api", {
   *   customDomain: "api.example.com"
   * })
   * ```
   *
   * ```js
   * new Api(stack, "Api", {
   *   customDomain: {
   *     domainName: "api.example.com",
   *     hostedZone: "domain.com",
   *     path: "v1"
   *   }
   * })
   * ```
   */
  customDomain?: string | ApiDomainProps;
  /**
   * Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.
   *
   * @example
   * ```js
   * new Api(stack, "Api", {
   *   authorizers: {
   *     Authorizer: {
   *       type: "user_pool",
   *       userPool: {
   *         id: userPool.userPoolId,
   *         clientIds: [userPoolClient.userPoolClientId],
   *       },
   *     },
   *   },
   * });
   * ```
   */
  authorizers?: Authorizers;
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new Api(stack, "Api", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     }
     *   }
     * });
     * ```
     */
    function?: FunctionProps;
    /**
     * The default authorizer for all the routes in the API.
     *
     * @example
     * ```js
     * new Api(stack, "Api", {
     *   defaults: {
     *     authorizer: "iam",
     *   }
     * });
     * ```
     *
     * @example
     * ```js
     * new Api(stack, "Api", {
     *   authorizers: {
     *     Authorizer: {
     *       type: "user_pool",
     *       userPool: {
     *         id: userPool.userPoolId,
     *         clientIds: [userPoolClient.userPoolClientId],
     *       },
     *     },
     *   },
     *   defaults: {
     *     authorizer: "Authorizer",
     *   }
     * });
     * ```
     */
    authorizer?:
      | "none"
      | "iam"
      | (string extends AuthorizerKeys
          ? Omit<AuthorizerKeys, "none" | "iam">
          : AuthorizerKeys);
    /**
     * An array of scopes to include in the authorization when using `user_pool` or `jwt` authorizers. These will be merged with the scopes from the attached authorizer.
     * @default []
     */
    authorizationScopes?: string[];
    /**
     * The [payload format version](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API.
     * @default "2.0"
     */
    payloadFormatVersion?: ApiPayloadFormatVersion;
    throttle?: {
      /**
       * The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
       *
       * @example
       * ```js
       * new Api(stack, "Api", {
       *   defaults: {
       *     throttle: {
       *       burst: 100
       *     }
       *   }
       * })
       * ```
       */
      burst?: number;
      /**
       * The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
       *
       * @example
       * ```js
       * new Api(stack, "Api", {
       *   defaults: {
       *     throttle: {
       *       rate: 10
       *     }
       *   }
       * })
       * ```
       */
      rate?: number;
    };
  };
  cdk?: {
    /**
     * Import the underlying HTTP API or override the default configuration
     *
     * @example
     * ```js
     * import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
     *
     * new Api(stack, "Api", {
     *   cdk: {
     *     httpApi: HttpApi.fromHttpApiAttributes(stack, "MyHttpApi", {
     *       httpApiId,
     *     }),
     *   }
     * });
     * ```
     */
    httpApi?: apig.IHttpApi | apig.HttpApiProps;
    /**
     * Configures the stages to create for the HTTP API.
     *
     * Note that, a default stage is automatically created, unless the `cdk.httpApi.createDefaultStage` is set to `false.
     *
     * @example
     * ```js
     * import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
     *
     * new Api(stack, "Api", {
     *   cdk: {
     *     httpStages: [{
     *       stageName: "dev",
     *       autoDeploy: false,
     *     }],
     *   }
     * });
     * ```
     */
    httpStages?: Omit<apig.HttpStageProps, "httpApi">[];
  };
}

export type ApiRouteProps<AuthorizerKeys> =
  | FunctionInlineDefinition
  | ApiFunctionRouteProps<AuthorizerKeys>
  | ApiHttpRouteProps<AuthorizerKeys>
  | ApiAlbRouteProps<AuthorizerKeys>
  | ApiPothosRouteProps<AuthorizerKeys>;

interface ApiBaseRouteProps<AuthorizerKeys = string> {
  authorizer?:
    | "none"
    | "iam"
    | (string extends AuthorizerKeys
        ? Omit<AuthorizerKeys, "none" | "iam">
        : AuthorizerKeys);
  authorizationScopes?: string[];
}

/**
 * Specify a function route handler and configure additional options
 *
 * @example
 * ```js
 * api.addRoutes(stack, {
 *   "GET /notes/{id}": {
 *     type: "function",
 *     function: "src/get.main",
 *     payloadFormatVersion: "1.0",
 *   }
 * });
 * ```
 */
export interface ApiFunctionRouteProps<AuthorizersKeys = string>
  extends ApiBaseRouteProps<AuthorizersKeys> {
  type?: "function";
  /**
   *The function definition used to create the function for this route.
   */
  function?: FunctionDefinition;
  /**
   * The payload format version for the route.
   *
   * @default "2.0"
   */
  payloadFormatVersion?: ApiPayloadFormatVersion;
  cdk?: {
    /**
     * Use an existing Lambda function.
     */
    function?: lambda.IFunction;
  };
}

/**
 * Specify a route handler that forwards to another URL
 *
 * @example
 * ```js
 * api.addRoutes(stack, {
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

/**
 * Specify a route handler that forwards to an ALB
 *
 * @example
 * ```js
 * api.addRoutes(stack, {
 *   "GET /notes/{id}": {
 *     type: "alb",
 *     cdk: {
 *       albListener: listener,
 *     }
 *   }
 * });
 * ```
 */
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

/**
 * Specify a route handler that handles GraphQL queries using Pothos
 *
 * @example
 * ```js
 * api.addRoutes(stack, {
 *   "POST /graphql": {
 *      type: "pothos",
 *      schema: "backend/functions/graphql/schema.ts",
 *      output: "graphql/schema.graphql",
 *      function: {
 *        handler: "functions/graphql/graphql.ts",
 *      },
 *      commands: [
 *        "./genql graphql/graphql.schema graphql/
 *      ]
 *   }
 * })
 * ```
 */
export interface ApiPothosRouteProps<AuthorizerKeys>
  extends ApiBaseRouteProps<AuthorizerKeys> {
  type: "pothos";
  /**
   * The function definition used to create the function for this route. Must be a graphql handler
   */
  function: FunctionDefinition;
  /**
   * Path to pothos schema
   */
  schema?: string;
  /**
   * File to write graphql schema to
   */
  output?: string;
  /**
   * Commands to run after generating schema. Useful for code generation steps
   */
  commands?: string[];
}

/////////////////////
// Construct
/////////////////////

/**
 * The Api construct is a higher level CDK construct that makes it easy to create an API.
 *
 * @example
 *
 * ```ts
 * import { Api } from "@serverless-stack/resources";
 *
 * new Api(stack, "Api", {
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
    Authorizers extends Record<string, ApiAuthorizer> = Record<
      string,
      ApiAuthorizer
    >
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
    [key: string]:
      | { type: "function"; function: Fn }
      | { type: "lambda_function"; function: lambda.IFunction }
      | ({ type: "pothos"; function: Fn } & Pick<
          ApiPothosRouteProps<any>,
          "schema" | "output" | "commands"
        >)
      | { type: "url"; url: string }
      | { type: "alb"; alb: elb.IApplicationListener };
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
   * The AWS generated URL of the Api.
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

  /**
   * The ARN of the internally created API Gateway HTTP API
   */
  public get httpApiArn(): string {
    const stack = Stack.of(this);
    return `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.cdk.httpApi.apiId}`;
  }

  /**
   * The id of the internally created API Gateway HTTP API
   */
  public get httpApiId(): string {
    return this.cdk.httpApi.apiId;
  }

  /**
   * Adds routes to the Api after it has been created.
   *
   * @example
   * ```js
   * api.addRoutes(stack, {
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
   * Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.
   *
   * @example
   * ```js
   * const api = new Api(stack, "Api", {
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   *
   * const listFunction = api.getFunction("GET /notes");
   * ```
   */
  public getFunction(routeKey: string): Fn | undefined {
    const route = this.routesData[this.normalizeRouteKey(routeKey)];
    if (!route) return;
    if (route.type === "function" || route.type === "pothos") {
      return route.function;
    }
  }

  /**
   * Attaches the given list of permissions to all the routes. This allows the functions to access other AWS resources.
   *
   * @example
   *
   * ```js
   * api.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    for (const route of Object.values(this.routesData)) {
      if (route.type === "function" || route.type === "pothos") {
        route.function.attachPermissions(permissions);
      }
    }
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  /**
   * Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.
   *
   * @example
   * ```js
   * const api = new Api(stack, "Api", {
   *   routes: {
   *     "GET    /notes": "src/list.main",
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
          if (data.type === "function")
            return {
              type: data.type,
              route: key,
              fn: getFunctionRef(data.function),
            };

          if (data.type === "pothos")
            return {
              type: data.type,
              route: key,
              fn: getFunctionRef(data.function),
              schema: data.schema,
              output: data.output,
              commands: data.commands,
            };

          return { type: data.type, route: key };
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
          `Cannot configure the "cors" when "cdk.httpApi" is a construct`
        );
      }
      if (accessLog !== undefined) {
        throw new Error(
          `Cannot configure the "accessLog" when "cdk.httpApi" is a construct`
        );
      }
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when "cdk.httpApi" is a construct`
        );
      }
      if (cdk?.httpStages !== undefined) {
        throw new Error(
          `Cannot configure the "stages" when "cdk.httpApi" is a construct`
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
                  (type) =>
                    apigAuthorizers.HttpLambdaResponseType[
                      type.toUpperCase() as keyof typeof apigAuthorizers.HttpLambdaResponseType
                    ]
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
    const [routeProps, integration] = (() => {
      if (Fn.isInlineDefinition(routeValue)) {
        const routeProps: ApiFunctionRouteProps<keyof Authorizers> = {
          function: routeValue,
        };
        return [
          routeProps,
          this.createFunctionIntegration(
            scope,
            routeKey,
            routeProps,
            postfixName
          ),
        ];
      }
      if (routeValue.type === "alb") {
        return [
          routeValue,
          this.createAlbIntegration(scope, routeKey, routeValue, postfixName),
        ];
      }
      if (routeValue.type === "url") {
        return [
          routeValue,
          this.createHttpIntegration(scope, routeKey, routeValue, postfixName),
        ];
      }
      if (routeValue.type === "pothos") {
        return [
          routeValue,
          this.createPothosIntegration(
            scope,
            routeKey,
            routeValue,
            postfixName
          ),
        ];
      }
      if (routeValue.cdk?.function) {
        return [
          routeValue,
          this.createCdkFunctionIntegration(
            scope,
            routeKey,
            routeValue,
            postfixName
          ),
        ];
      }
      if ("function" in routeValue) {
        return [
          routeValue,
          this.createFunctionIntegration(
            scope,
            routeKey,
            routeValue,
            postfixName
          ),
        ];
      }
      if ("handler" in routeValue)
        throw new Error(
          `Function definition must be nested under the "function" key in the route props for "${routeKey}". ie. { function: { handler: "myfunc.handler" } }`
        );
      throw new Error(
        `Invalid route type for "${routeKey}". Must be one of: alb, url, function`
      );
    })();

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
    this.routesData[routeKey] = {
      type: "url",
      url: routeProps.url,
    };

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
    this.routesData[routeKey] = {
      type: "alb",
      alb: routeProps.cdk?.albListener!,
    };

    return integration;
  }

  protected createPothosIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiPothosRouteProps<keyof Authorizers>,
    postfixName: string
  ): apig.HttpRouteIntegration {
    const result = this.createFunctionIntegration(
      scope,
      routeKey,
      {
        ...routeProps,
        type: "function",
        payloadFormatVersion: "2.0",
      },
      postfixName
    );
    const data = this.routesData[routeKey];
    if (data.type === "function") {
      this.routesData[routeKey] = {
        ...data,
        type: "pothos",
        output: routeProps.output,
        schema: routeProps.schema,
        commands: routeProps.commands,
      };
    }
    return result;
  }

  protected createCdkFunctionIntegration(
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
        `PayloadFormatVersion: sst.Api does not currently support ${payloadFormatVersion} payload format version. Only "V1" and "V2" are currently supported.`
      );
    }
    const integrationPayloadFormatVersion =
      payloadFormatVersion === "1.0"
        ? apig.PayloadFormatVersion.VERSION_1_0
        : apig.PayloadFormatVersion.VERSION_2_0;

    ///////////////////
    // Create Function
    ///////////////////
    const lambda = routeProps.cdk?.function!;

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
    this.routesData[routeKey] = {
      type: "lambda_function",
      function: lambda,
    };

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
        `PayloadFormatVersion: sst.Api does not currently support ${payloadFormatVersion} payload format version. Only "V1" and "V2" are currently supported.`
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
      routeProps.function!,
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
    this.routesData[routeKey] = {
      type: "function",
      function: lambda,
    };

    // Attached existing permissions
    this.permissionsAttachedForAllRoutes.forEach((permissions) =>
      lambda.attachPermissions(permissions)
    );

    return integration;
  }

  private buildRouteAuth(routeProps: ApiBaseRouteProps<keyof Authorizers>) {
    const authorizerKey =
      routeProps?.authorizer || this.props.defaults?.authorizer || "none";
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

    if (
      !this.props.authorizers ||
      !this.props.authorizers[authorizerKey as string]
    ) {
      throw new Error(`Cannot find authorizer "${authorizerKey}"`);
    }

    const authorizer = this.authorizersData[authorizerKey as string];
    const authorizationType =
      this.props.authorizers[authorizerKey as string].type;
    const authorizationScopes =
      authorizationType === "jwt" || authorizationType === "user_pool"
        ? routeProps?.authorizationScopes ||
          this.props.defaults?.authorizationScopes
        : undefined;

    return { authorizationType, authorizer, authorizationScopes };
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }
}
