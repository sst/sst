import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as apigV1AccessLog from "./util/apiGatewayV1AccessLog.js";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Bucket } from "./Bucket.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Permissions } from "./util/permission.js";

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

export interface ApiGatewayV1ApiAccessLogProps
  extends apigV1AccessLog.AccessLogProps {}

export interface ApiGatewayV1ApiProps<
  Authorizers extends Record<string, ApiGatewayV1ApiAuthorizer> = Record<
    string,
    never
  >,
  AuthorizerKeys = keyof Authorizers
> {
  cdk?: {
    /**
     * Override the internally created rest api
     *
     * @example
     * ```js
     *
     * new ApiGatewayV1Api(stack, "Api", {
     *   cdk: {
     *     restApi: {
     *       description: "My api"
     *     }
     *   }
     * });
     * ```
     */
    restApi?: apig.IRestApi | apig.RestApiProps;
    /**
     * If you are importing an existing API Gateway REST API project, you can import existing route paths by providing a list of paths with their corresponding resource ids.
     *
     * @example
     * ```js
     * import { RestApi } from "aws-cdk-lib/aws-apigateway";
     *
     * new ApiGatewayV1Api(stack, "Api", {
     *   cdk: {
     *     restApi: RestApi.fromRestApiAttributes(stack, "ImportedApi", {
     *       restApiId,
     *       rootResourceId,
     *     }),
     *     importedPaths: {
     *       "/notes": "slx2bn",
     *       "/users": "uu8xs3",
     *     },
     *   }
     * });
     * ```
     *
     * API Gateway REST API is structured in a tree structure:
     * - Each path part is a separate API Gateway resource object.
     * - And a path part is a child resource of the preceding part.
     * So the part path /notes, is a child resource of the root resource /. And /notes/{noteId} is a child resource of /notes. If /notes has been created in the imported API, you have to import it before creating the /notes/{noteId} child route.
     */
    importedPaths?: { [path: string]: string };
  };
  /**
   * Define the routes for the API. Can be a function, proxy to another API, or point to an ALB
   *
   * @example
   *
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   "GET /notes"      : "src/list.main",
   *   "GET /notes/{id}" : "src/get.main",
   *   "$default": "src/default.main"
   * })
   * ```
   */
  routes?: Record<string, ApiGatewayV1ApiRouteProps<AuthorizerKeys>>;
  /**
   * CORS support applied to all endpoints in this API
   *
   * @example
   *
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   cors: true,
   * });
   * ```
   *
   */
  cors?: boolean;
  /**
   * Enable CloudWatch access logs for this API
   *
   * @example
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   accessLog: true
   * });
   *
   * ```
   * @example
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   accessLog: {
   *     retention: "one_week",
   *   },
   * });
   * ```
   */
  accessLog?: boolean | string | ApiGatewayV1ApiAccessLogProps;
  /**
   * Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)
   *
   * @example
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   customDomain: "api.example.com"
   * })
   * ```
   *
   * @example
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   customDomain: {
   *     domainName: "api.example.com",
   *     hostedZone: "domain.com",
   *     path: "v1"
   *   }
   * })
   * ```
   */
  customDomain?: string | ApiGatewayV1ApiCustomDomainProps;
  /**
   * Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.
   *
   * @example
   * ```js
   * new ApiGatewayV1Api(stack, "Api", {
   *   authorizers: {
   *     MyAuthorizer: {
   *       type: "user_pools",
   *       userPoolIds: [userPool.userPoolId],
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
     * new ApiGatewayV1Api(stack, "Api", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     }
     *   er
     * });
     * ```
     */
    function?: FunctionProps;
    /**
     * The authorizer for all the routes in the API.
     *
     * @example
     * ```js
     * new ApiGatewayV1Api(stack, "Api", {
     *   defaults: {
     *     authorizer: "iam",
     *   }
     * });
     * ```
     *
     * @example
     * ```js
     * new ApiGatewayV1Api(stack, "Api", {
     *   authorizers: {
     *     Authorizer: {
     *       type: "user_pools",
     *       userPoolIds: [userPool.userPoolId],
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
      | (string extends AuthorizerKeys ? never : AuthorizerKeys);
    /**
     * An array of scopes to include in the authorization when using `user_pool` or `jwt` authorizers. These will be merged with the scopes from the attached authorizer.
     * @default []
     */
    authorizationScopes?: string[];
  };
}

export type ApiGatewayV1ApiRouteProps<AuthorizerKeys> =
  | FunctionInlineDefinition
  | ApiGatewayV1ApiFunctionRouteProps<AuthorizerKeys>;

/**
 * Specify a function route handler and configure additional options
 *
 * @example
 * ```js
 * api.addRoutes(props.stack, {
 *   "GET /notes/{id}": {
 *     type: "function",
 *     function: "src/get.main",
 *   }
 * });
 * ```
 */
export interface ApiGatewayV1ApiFunctionRouteProps<AuthorizerKeys = never> {
  function: FunctionDefinition;
  authorizer?:
    | "none"
    | "iam"
    | (string extends AuthorizerKeys ? never : AuthorizerKeys);
  authorizationScopes?: string[];
  cdk?: {
    method?: Omit<
      apig.MethodOptions,
      "authorizer" | "authorizationType" | "authorizationScopes"
    >;
    integration?: apig.LambdaIntegrationOptions;
  };
}

export type ApiGatewayV1ApiAuthorizer =
  | ApiGatewayV1ApiUserPoolsAuthorizer
  | ApiGatewayV1ApiLambdaTokenAuthorizer
  | ApiGatewayV1ApiLambdaRequestAuthorizer;

interface ApiGatewayV1ApiBaseAuthorizer {
  /**
   * The name of the authorizer.
   */
  name?: string;
  /**
   * The amount of time the results are cached.
   * @default Not cached
   */
  resultsCacheTtl?: Duration;
}

/**
 * Specify a user pools authorizer and configure additional options.
 *
 * @example
 * ```js
 * new ApiGatewayV1Api(stack, "Api", {
 *   authorizers: {
 *     MyAuthorizer: {
 *       type: "user_pools",
 *       userPoolIds: [userPool.userPoolId],
 *     },
 *   },
 * });
 * ```
 */
export interface ApiGatewayV1ApiUserPoolsAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  /**
   * String literal to signify that the authorizer is user pool authorizer.
   */
  type: "user_pools";
  /**
   * The ids of the user pools to use for authorization.
   */
  userPoolIds?: string[];
  /**
   * The identity source for which authorization is requested.
   */
  identitySource?: string;
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer: apig.CognitoUserPoolsAuthorizer;
  };
}

/**
 * Specify a Lambda TOKEN authorizer and configure additional options.
 *
 * @example
 * ```js
 * new ApiGatewayV1Api(stack, "Api", {
 *   authorizers: {
 *     MyAuthorizer: {
 *       type: "lambda_token",
 *       function: new Function(stack, "Authorizer", {
 *         handler: "test/lambda.handler"
 *       }),
 *       identitySources: [apig.IdentitySource.header("Authorization")],
 *     },
 *   },
 * });
 * ```
 */
export interface ApiGatewayV1ApiLambdaTokenAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  /**
   * String literal to signify that the authorizer is Lambda TOKEN authorizer.
   */
  type: "lambda_token";
  /**
   * Used to create the authorizer function
   */
  function?: Fn;
  /**
   * The identity source for which authorization is requested.
   */
  identitySource?: string;
  /**
   * An regex to be matched against the authorization token.
   *
   * Note that when matched, the authorizer lambda is invoked, otherwise a 401 Unauthorized is returned to the client.
   */
  validationRegex?: string;
  cdk?: {
    /**
     * An IAM role for API Gateway to assume before calling the Lambda-based authorizer.
     */
    assumeRole?: iam.IRole;
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer?: apig.TokenAuthorizer;
  };
}

/**
 * Specify a Lambda REQUEST authorizer and configure additional options.
 *
 * @example
 * ```js
 * new ApiGatewayV1Api(stack, "Api", {
 *   authorizers: {
 *     MyAuthorizer: {
 *       type: "lambda_request",
 *       function: new Function(stack, "Authorizer", {
 *         handler: "test/lambda.handler"
 *       }),
 *       identitySources: [apig.IdentitySource.header("Authorization")],
 *     },
 *   },
 * });
 * ```
 */
export interface ApiGatewayV1ApiLambdaRequestAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  /**
   * String literal to signify that the authorizer is Lambda REQUEST authorizer.
   */
  type: "lambda_request";
  /**
   * Used to create the authorizer function
   */
  function?: Fn;
  /**
   * The identity sources for which authorization is requested.
   */
  identitySources?: string[];
  cdk?: {
    /**
     * An IAM role for API Gateway to assume before calling the Lambda-based authorizer.
     */
    assumeRole?: iam.IRole;
    /**
     * This allows you to override the default settings this construct uses internally to create the authorizer.
     */
    authorizer?: apig.TokenAuthorizer;
  };
}

/**
 * The customDomain for this API. SST currently supports domains that are configured using Route 53. If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
 *
 * @example
 * ```js
 * new ApiGatewayV1Api(stack, "Api", {
 *   customDomain: "api.domain.com",
 * });
 * ```
 *
 * @example
 * ```js
 * new ApiGatewayV1Api(stack, "Api", {
 *   customDomain: {
 *     domainName: "api.domain.com",
 *     hostedZone: "domain.com",
 *     endpointType: EndpointType.EDGE,
 *     path: "v1",
 *   }
 * });
 * ```
 *
 * Note that, SST automatically creates a Route 53 A record in the hosted zone to point the custom domain to the API Gateway domain.
 */
export interface ApiGatewayV1ApiCustomDomainProps {
  /**
   * The domain to be assigned to the API endpoint.
   */
  domainName?: string;
  /**
   * The hosted zone in Route 53 that contains the domain.
   *
   * By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is `api.domain.com`, SST will default the hostedZone to `domain.com`.
   */
  hostedZone?: string;
  /**
   * The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the API will become `https://api.domain.com/v1`. If the path is not set, the custom domain URL will be `https://api.domain.com`.
   *
   * :::caution
   * You cannot change the path once it has been set.
   * :::
   *
   * Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.
   */
  path?: string;
  /**
   * The type of endpoint for this DomainName.
   * @default `regional`
   */
  endpointType?: Lowercase<keyof typeof apig.EndpointType>;
  mtls?: {
    /**
     * The bucket that the trust store is hosted in.
     */
    bucket: Bucket;
    /**
     * The key in S3 to look at for the trust store.
     */
    key: string;
    /**
     * The version of the S3 object that contains your truststore.
     *
     * To specify a version, you must have versioning enabled for the S3 bucket.
     */
    version?: string;
  };
  /**
   * The Transport Layer Security (TLS) version + cipher suite for this domain name.
   * @default `TLS 1.0`
   */
  securityPolicy?: "TLS 1.0" | "TLS 1.2";
  cdk?: {
    /**
     * Import the underlying API Gateway custom domain names.
     */
    domainName?: apig.IDomainName;
    /**
     * Import the underlying Route 53 hosted zone.
     */
    hostedZone?: route53.IHostedZone;
    /**
     * Import the underlying ACM certificate.
     */
    certificate?: acm.ICertificate;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 *
 * The `ApiGatewayV1Api` construct is a higher level CDK construct that makes it easy to create an API Gateway REST API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.
 *
 * :::note
 * If you are creating a new API, use the `Api` construct instead.
 * :::
 *
 * The Api construct uses [API Gateway V2](https://aws.amazon.com/blogs/compute/announcing-http-apis-for-amazon-api-gateway/). It's both faster and cheaper. However, if you need features like Usage Plans and API keys, use the `ApiGatewayV1Api` construct instead. You can [check out a detailed comparison here](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html).
 *
 * @example
 * ### Minimal config
 *
 * ```js
 * import { ApiGatewayV1Api } from "@serverless-stack/resources";
 *
 * new ApiGatewayV1Api(stack, "Api", {
 *   routes: {
 *     "GET    /notes"     : "src/list.main",
 *     "POST   /notes"     : "src/create.main",
 *     "GET    /notes/{id}": "src/get.main",
 *     "PUT    /notes/{id}": "src/update.main",
 *     "DELETE /notes/{id}": "src/delete.main",
 *   },
 * });
 * ```
 */
export class ApiGatewayV1Api<
    Authorizers extends Record<string, ApiGatewayV1ApiAuthorizer> = Record<
      string,
      never
    >
  >
  extends Construct
  implements SSTConstruct
{
  public readonly cdk: {
    /**
     * The internally created rest API
     */
    restApi: apig.RestApi;
    /**
     * The internally created log group
     */
    accessLogGroup?: logs.LogGroup;
    /**
     * The internally created domain name
     */
    domainName?: apig.DomainName;
    /**
     * The internally created certificate
     */
    certificate?: acm.Certificate | acm.DnsValidatedCertificate;
  };
  private _deployment?: apig.Deployment;
  private _customDomainUrl?: string;
  private importedResources: { [path: string]: apig.IResource };
  private props: ApiGatewayV1ApiProps<Authorizers>;
  private functions: { [key: string]: Fn };
  private authorizersData: Record<string, apig.IAuthorizer>;
  private permissionsAttachedForAllRoutes: Permissions[];

  constructor(
    scope: Construct,
    id: string,
    props?: ApiGatewayV1ApiProps<Authorizers>
  ) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functions = {};
    this.authorizersData = {};
    this.importedResources = {};
    this.permissionsAttachedForAllRoutes = [];

    this.createRestApi();
    this.addAuthorizers(this.props.authorizers || ({} as Authorizers));
    this.addRoutes(this, this.props.routes || {});
  }

  /**
   * The AWS generated URL of the Api.
   */
  public get url(): string {
    return this.cdk.restApi.url;
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
    return Object.keys(this.functions);
  }

  /**
   * The ARN of the internally created API Gateway REST API
   */
  public get restApiArn(): string {
    const stack = Stack.of(this);
    return `arn:${stack.partition}:apigateway:${stack.region}::/restapis/${this.cdk.restApi.restApiId}`;
  }

  /**
   * The id of the internally created API Gateway REST API
   */
  public get restApiId(): string {
    return this.cdk.restApi.restApiId;
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
    routes: Record<string, ApiGatewayV1ApiRouteProps<keyof Authorizers>>
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

  /**
   * Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.
   *
   * @example
   * ```js
   * const api = new ApiGatewayV1Api(stack, "Api", {
   *   routes: {
   *     "GET    /notes": "src/list.main",
   *   },
   * });
   *
   * const listFunction = api.getFunction("GET /notes");
   * ```
   */
  public getFunction(routeKey: string): Fn | undefined {
    return this.functions[this.normalizeRouteKey(routeKey)];
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
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  /**
   * Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.
   *
   * @example
   * ```js
   * const api = new ApiGatewayV1Api(stack, "Api", {
   *   routes: {
   *     "GET /notes": "src/list.main",
   *   },
   * });
   *
   * api.attachPermissionsToRoute("GET /notes", ["s3"]);
   * ```
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
      type: "ApiGatewayV1Api" as const,
      data: {
        customDomainUrl: this._customDomainUrl,
        url: this.cdk.restApi.url,
        restApiId: this.cdk.restApi.restApiId,
        routes: Object.entries(this.functions).map(([key, data]) => {
          return {
            type: "function" as const,
            route: key,
            fn: getFunctionRef(data),
          };
        }),
      },
    };
  }

  private createRestApi() {
    const { cdk, cors, accessLog, customDomain } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.restApi)) {
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
      this.cdk.restApi = cdk?.restApi as apig.RestApi;

      // Create an API Gateway deployment resource to trigger a deployment
      this._deployment = new apig.Deployment(this, "Deployment", {
        api: this.cdk.restApi,
      });
      const cfnDeployment = this._deployment.node
        .defaultChild as apig.CfnDeployment;
      cfnDeployment.stageName = app.stage;

      if (cdk?.importedPaths) {
        this.importResources(cdk?.importedPaths);
      }
    } else {
      const restApiProps = (cdk?.restApi || {}) as apig.RestApiProps;

      // Validate input
      if (cdk?.importedPaths !== undefined) {
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

      this.cdk.accessLogGroup = accessLogData?.logGroup;

      this.cdk.restApi = new apig.RestApi(this, "Api", {
        restApiName: app.logicalPrefixedName(id),
        ...restApiProps,
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
  }

  private buildCorsConfig(cors?: boolean): apig.CorsOptions | undefined {
    // Case: cors is false
    if (cors === false) {
      return undefined;
    }

    // Case: cors is true or undefined
    return {
      allowHeaders: ["*"],
      allowOrigins: apig.Cors.ALL_ORIGINS,
      allowMethods: apig.Cors.ALL_METHODS,
    } as apig.CorsOptions;
  }

  private createGatewayResponseForCors(cors?: boolean): void {
    if (!cors) {
      return;
    }

    this.cdk.restApi.addGatewayResponse("GatewayResponseDefault4XX", {
      type: apig.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });

    this.cdk.restApi.addGatewayResponse("GatewayResponseDefault5XX", {
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

    // Case: customDomain.domainName is a string
    else if (customDomain.domainName) {
      domainName = customDomain.domainName;

      // parse customDomain.domainName
      if (cdk.Token.isUnresolved(customDomain.domainName)) {
        // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
        // is because "hostedZone" cannot be parsed from a TOKEN value.
        if (!customDomain.hostedZone && !customDomain.cdk?.hostedZone) {
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
      if (customDomain.hostedZone && customDomain.cdk?.hostedZone) {
        throw new Error(
          `Use either the "customDomain.hostedZone" or the "customDomain.cdk.hostedZone" to configure the custom domain hosted zone. Do not use both.`
        );
      }
      if (customDomain.hostedZone) {
        hostedZoneDomain = customDomain.hostedZone;
      } else if (customDomain.cdk?.hostedZone) {
        hostedZone = customDomain.cdk?.hostedZone;
      } else {
        hostedZoneDomain = domainName.split(".").slice(1).join(".");
      }

      certificate = customDomain.cdk?.certificate;
      basePath = customDomain.path;
      endpointType = customDomain.endpointType;
      mtls = customDomain.mtls;
      securityPolicy = customDomain.securityPolicy;
    }

    // Case: customDomain.domainName is a construct
    else if (customDomain.cdk?.domainName) {
      apigDomainName = customDomain.cdk.domainName;

      // customDomain.domainName is imported
      if (
        apigDomainName &&
        (customDomain.hostedZone || customDomain.cdk?.hostedZone)
      ) {
        throw new Error(
          `Cannot configure the "hostedZone" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.cdk?.certificate) {
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
      if (endpointType === "edge") {
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
      this.cdk.certificate = certificate;
    }

    /////////////////////
    // Create API Gateway domain name
    /////////////////////
    if (!apigDomainName && domainName) {
      // Create custom domain in API Gateway
      apigDomainName = new apig.DomainName(this, "DomainName", {
        domainName,
        certificate: certificate as acm.ICertificate,
        endpointType:
          endpointType &&
          apig.EndpointType[
            endpointType.toLocaleUpperCase() as keyof typeof apig.EndpointType
          ],
        mtls: mtls && {
          ...mtls,
          bucket: mtls.bucket.cdk.bucket,
        },
        securityPolicy:
          securityPolicy === "TLS 1.0"
            ? apig.SecurityPolicy.TLS_1_0
            : securityPolicy === "TLS 1.2"
            ? apig.SecurityPolicy.TLS_1_2
            : undefined,
      });
      this.cdk.domainName = apigDomainName;

      // Create DNS record
      this.createARecords(
        hostedZone as route53.IHostedZone,
        domainName,
        apigDomainName
      );
    }

    /////////////////////
    // Create base mapping
    /////////////////////
    if (apigDomainName) {
      new apig.BasePathMapping(this, "BasePath", {
        domainName: apigDomainName,
        restApi: this.cdk.restApi,
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

  private createARecords(
    hostedZone: route53.IHostedZone,
    domainName: string,
    apigDomain: apig.IDomainName
  ) {
    // create DNS record
    const recordProps = {
      recordName: domainName,
      zone: hostedZone as route53.IHostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayDomain(apigDomain)
      ),
    };
    const records = [
      new route53.ARecord(this, "AliasRecord", recordProps),
      new route53.AaaaRecord(this, "AliasRecordAAAA", recordProps),
    ];
    // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
    //       construct will append ".${hostedZoneName}" to the end of the domain.
    //       This is because the construct tries to check if the record name
    //       ends with the domain name. If not, it will append the domain name.
    //       So, we need remove this behavior.
    if (cdk.Token.isUnresolved(domainName)) {
      records.forEach((record) => {
        const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
        cfnRecord.name = domainName;
      });
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
          restApi: this.cdk.restApi,
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
    return this.cdk.restApi.root.resourceForPath(path);
  }

  private addAuthorizers(authorizers: Authorizers) {
    Object.entries(authorizers).forEach(([key, value]) => {
      if (key === "none") {
        throw new Error(`Cannot name an authorizer "none"`);
      } else if (key === "iam") {
        throw new Error(`Cannot name an authorizer "iam"`);
      } else if (value.type === "user_pools") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.userPoolIds) {
            throw new Error(`Missing "userPoolIds" for "${key}" authorizer`);
          }
          const userPools = value.userPoolIds.map((userPoolId) =>
            cognito.UserPool.fromUserPoolId(
              this,
              `${key}-ImportedUserPool`,
              userPoolId
            )
          );
          this.authorizersData[key] = new apig.CognitoUserPoolsAuthorizer(
            this,
            key,
            {
              cognitoUserPools: userPools,
              authorizerName: value.name,
              identitySource: value.identitySource,
              resultsCacheTtl: value.resultsCacheTtl
                ? toCdkDuration(value.resultsCacheTtl)
                : cdk.Duration.seconds(0),
            }
          );
        }
      } else if (value.type === "lambda_token") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.function) {
            throw new Error(`Missing "function" for "${key}" authorizer`);
          }
          this.authorizersData[key] = new apig.TokenAuthorizer(this, key, {
            handler: value.function,
            authorizerName: value.name,
            identitySource: value.identitySource,
            validationRegex: value.validationRegex,
            assumeRole: value.cdk?.assumeRole,
            resultsCacheTtl: value.resultsCacheTtl
              ? toCdkDuration(value.resultsCacheTtl)
              : cdk.Duration.seconds(0),
          });
        }
      } else if (value.type === "lambda_request") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.function) {
            throw new Error(`Missing "function" for "${key}" authorizer`);
          } else if (!value.identitySources) {
            throw new Error(
              `Missing "identitySources" for "${key}" authorizer`
            );
          }
          this.authorizersData[key] = new apig.RequestAuthorizer(this, key, {
            handler: value.function,
            authorizerName: value.name,
            identitySources: value.identitySources,
            assumeRole: value.cdk?.assumeRole,
            resultsCacheTtl: value.resultsCacheTtl
              ? toCdkDuration(value.resultsCacheTtl)
              : cdk.Duration.seconds(0),
          });
        }
      }
    });
  }

  private addRoute(
    scope: Construct,
    routeKey: string,
    routeValue: ApiGatewayV1ApiRouteProps<keyof Authorizers>
  ): Fn {
    // Normalize routeKey
    ///////////////////
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
    const routeProps = Fn.isInlineDefinition(routeValue)
      ? ({ function: routeValue } as ApiGatewayV1ApiFunctionRouteProps<
          keyof Authorizers
        >)
      : (routeValue as ApiGatewayV1ApiFunctionRouteProps<keyof Authorizers>);
    const lambda = Fn.fromDefinition(
      scope,
      `Lambda_${methodStr}_${path}`,
      routeProps.function,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the ApiGatewayV1Api construct can apply the "defaults.function" to them.`
    );
    const integration = new apig.LambdaIntegration(
      lambda,
      routeProps.cdk?.integration
    );
    const methodOptions = this.buildRouteMethodOptions(routeProps);
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
    routeProps: ApiGatewayV1ApiFunctionRouteProps<keyof Authorizers>
  ): apig.MethodOptions {
    const authorizerKey =
      routeProps.authorizer || this.props.defaults?.authorizer || "none";
    if (authorizerKey === "none") {
      return {
        authorizationType: apig.AuthorizationType.NONE,
        ...routeProps.cdk?.method,
      };
    } else if (authorizerKey === "iam") {
      return {
        authorizationType: apig.AuthorizationType.IAM,
        ...routeProps.cdk?.method,
      };
    }

    if (!this.props.authorizers || !this.props.authorizers[authorizerKey]) {
      throw new Error(`Cannot find authorizer "${authorizerKey}"`);
    }

    const authorizer = this.authorizersData[authorizerKey as string];
    const authorizationType = this.props.authorizers[authorizerKey].type;
    if (authorizationType === "user_pools") {
      return {
        authorizationType: apig.AuthorizationType.COGNITO,
        authorizer,
        authorizationScopes:
          routeProps.authorizationScopes ||
          this.props.defaults?.authorizationScopes,
        ...routeProps.cdk?.method,
      };
    }

    return {
      authorizationType: apig.AuthorizationType.CUSTOM,
      authorizer,
      ...routeProps.cdk?.method,
    };
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
