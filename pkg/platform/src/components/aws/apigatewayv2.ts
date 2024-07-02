import { ComponentResourceOptions, Output, all, output } from "@pulumi/pulumi";
import { Component, Prettify, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs } from "./function";
import {
  hashStringToPrettyString,
  prefixName,
  sanitizeToPascalCase,
} from "../naming";
import { VisibleError } from "../error";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { RETENTION } from "./logging";
import { dns as awsDns } from "./dns.js";
import { ApiGatewayV2DomainArgs } from "./helpers/apigatewayv2-domain";
import { ApiGatewayV2LambdaRoute } from "./apigatewayv2-lambda-route";
import { ApiGatewayV2Authorizer } from "./apigatewayv2-authorizer";
import { apigatewayv2, cloudwatch } from "@pulumi/aws";

export interface ApiGatewayV2Args {
  /**
   * Set a custom domain for your HTTP API.
   *
   * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
   * providers, you'll need to pass in a `cert` that validates domain ownership and add the
   * DNS records.
   *
   * :::tip
   * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
   * providers.
   * :::
   *
   * @example
   *
   * By default this assumes the domain is hosted on Route 53.
   *
   * ```js
   * {
   *   domain: "example.com"
   * }
   * ```
   *
   * For domains hosted on Cloudflare.
   *
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: sst.cloudflare.dns()
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<ApiGatewayV2DomainArgs>>;
  /**
   * Configure the [API Gateway logs](https://docs.aws.amazon.com/apigateway/latest/developerguide/view-cloudwatch-log-events-in-cloudwatch-console.html) in CloudWatch. By default, access logs are enabled and kept forever.
   * @default `{retention: "forever"}`
   * @example
   * ```js
   * {
   *   accessLog: {
   *     retention: "1 week"
   *   }
   * }
   * ```
   */
  accessLog?: Input<{
    /**
     * The duration the API Gateway logs are kept in CloudWatch.
     * @default `forever`
     */
    retention?: Input<keyof typeof RETENTION>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the API Gateway HTTP API resource.
     */
    api?: Transform<apigatewayv2.ApiArgs>;
    /**
     * Transform the API Gateway HTTP API stage resource.
     */
    stage?: Transform<apigatewayv2.StageArgs>;
    /**
     * Transform the API Gateway HTTP API domain name resource.
     */
    domainName?: Transform<apigatewayv2.DomainNameArgs>;
    /**
     * Transform the CloudWatch LogGroup resource used for access logs.
     */
    accessLog?: Transform<cloudwatch.LogGroupArgs>;
    /**
     * Transform the routes. This is called for every route that is added.
     *
     * :::note
     * This is applied right before the resource is created. So it overrides the
     * props set by the route.
     * :::
     *
     * You can use this to set any common props for all the routes and their handler function.
     * Like the other transforms, you can either pass in an object or a callback.
     *
     * @example
     *
     * Here we are ensuring that all handler functions of our routes have a memory of `2048 MB`.
     *
     * ```js
     * {
     *   transform: {
     *     route: {
     *       handler: {
     *         memory: "2048 MB"
     *       },
     *     }
     *   }
     * }
     * ```
     *
     * Enable IAM auth for all our routes.
     *
     * ```js
     * {
     *   transform: {
     *     route: {
     *       args: (props) => {
     *         props.auth = { iam: true };
     *       }
     *     }
     *   }
     * }
     * ```
     */
    route?: {
      /**
       * Transform the handler function of the route.
       */
      handler?: Transform<FunctionArgs>;
      /**
       * Transform the arguments for the route.
       */
      args?: Transform<ApiGatewayV2RouteArgs>;
    };
  };
}

export interface ApiGatewayV2AuthorizerArgs {
  /**
   * The name of the authorizer.
   * @example
   * ```js
   * {
   *   name: "myAuthorizer",
   * }
   * ```
   */
  name: string;
  /**
   * Create a JWT or JSON Web Token authorizer that can be used by the routes.
   *
   * @example
   * You can configure JWT auth.
   *
   * ```js
   * {
   *   jwt: {
   *     issuer: "https://issuer.com/",
   *     audiences: ["https://api.example.com"],
   *     identitySource: "$request.header.AccessToken"
   *   }
   * }
   * ```
   *
   * You can also use Cognito as the identity provider.
   *
   * ```js
   * {
   *   jwt: {
   *     audiences: [userPoolClient.id],
   *     issuer: $interpolate`https://cognito-idp.${aws.getArnOutput(userPool).region}.amazonaws.com/${userPool.id}`,
   *   }
   * }
   * ```
   *
   * Where `userPool` and `userPoolClient` are:
   *
   * ```js
   * const userPool = new aws.cognito.UserPool();
   * const userPoolClient = new aws.cognito.UserPoolClient();
   * ```
   */
  jwt: Input<{
    /**
     * Base domain of the identity provider that issues JSON Web Tokens.
     */
    issuer: Input<string>;
    /**
     * List of the intended recipients of the JWT. A valid JWT must provide an `aud` that matches at least one entry in this list.
     */
    audiences: Input<Input<string>[]>;
    /**
     * Specifies where to extract the JWT from the request.
     * @default `"$request.header.Authorization"`
     */
    identitySource?: Input<string>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the API Gateway authorizer resource.
     */
    authorizer?: Transform<apigatewayv2.AuthorizerArgs>;
  };
}

export interface ApiGatewayV2RouteArgs {
  /**
   * Enable auth for your HTTP API.
   *
   * :::note
   * Currently IAM and JWT auth are supported.
   * :::
   *
   * @example
   * ```js
   * {
   *   auth: {
   *     iam: true
   *   }
   * }
   * ```
   */
  auth?: Input<{
    /**
     * Enable IAM authorization for a given API route. When IAM auth is enabled, clients need to use Signature Version 4 to sign their requests with their AWS credentials.
     */
    iam?: Input<true>;
    /**
     * Enable JWT or JSON Web Token authorization for a given API route. When JWT auth is enabled, clients need to include a valid JWT in their requests.
     *
     * @example
     * You can configure JWT auth.
     *
     * ```js
     * {
     *   auth: {
     *     jwt: {
     *       authorizer: myAuthorizer.id,
     *       scopes: ["read:profile", "write:profile"]
     *     }
     *   }
     * }
     * ```
     *
     * Where `myAuthorizer` is created by calling the `addAuthorizer` method.
     */
    jwt?: Input<{
      /**
       * Authorizer ID of the JWT authorizer.
       */
      authorizer: Input<string>;
      /**
       * Defines the permissions or access levels that the JWT grants. If the JWT does not have the required scope, the request is rejected. By default it does not require any scopes.
       */
      scopes?: Input<Input<string>[]>;
    }>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the API Gateway HTTP API integration resource.
     */
    integration?: Transform<apigatewayv2.IntegrationArgs>;
    /**
     * Transform the API Gateway HTTP API route resource.
     */
    route?: Transform<apigatewayv2.RouteArgs>;
  };
}

/**
 * The `ApiGatewayV2` component lets you add an [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) to your app.
 *
 * @example
 *
 * #### Create the API
 *
 * ```ts
 * const api = new sst.aws.ApiGatewayV2("MyApi");
 * ```
 *
 * #### Add a custom domain
 *
 * ```js {2}
 * new sst.aws.ApiGatewayV2("MyApi", {
 *   domain: "api.example.com"
 * });
 * ```
 *
 * #### Add routes
 *
 * ```ts
 * api.route("GET /", "src/get.handler");
 * api.route("POST /", "src/post.handler");
 * ```
 *
 * #### Configure the routes
 *
 * You can configure the route and its handler function.
 *
 * ```ts
 * api.route("GET /", "src/get.handler", { auth: { iam: true } });
 * api.route("POST /", { handler: "src/post.handler", memory: "2048 MB" });
 * ```
 *
 * #### Set defaults for all routes
 *
 * You can use the `transform` to set some defaults for all your routes. For example,
 * instead of setting the `memory` for each route.
 *
 * ```ts
 * api.route("GET /", { handler: "src/get.handler", memory: "2048 MB" });
 * api.route("POST /", { handler: "src/post.handler", memory: "2048 MB" });
 * ```
 *
 * You can set it through the `transform`.
 *
 * ```ts {5}
 * new sst.aws.ApiGatewayV2("MyApi", {
 *   transform: {
 *     route: {
 *       handler: {
 *         memory: "2048 MB"
 *       }
 *     }
 *   }
 * });
 *
 * api.route("GET /", "src/get.handler");
 * api.route("POST /", "src/post.handler");
 * ```
 */
export class ApiGatewayV2 extends Component implements Link.Linkable {
  private constructorName: string;
  private constructorArgs: ApiGatewayV2Args;
  private api: apigatewayv2.Api;
  private apigDomain?: apigatewayv2.DomainName;
  private apiMapping?: Output<apigatewayv2.ApiMapping>;
  private logGroup: cloudwatch.LogGroup;

  constructor(
    name: string,
    args: ApiGatewayV2Args = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const accessLog = normalizeAccessLog();
    const domain = normalizeDomain();

    const api = createApi();
    const logGroup = createLogGroup();
    createStage();

    const certificateArn = createSsl();
    const apigDomain = createDomainName();
    createDnsRecords();
    const apiMapping = createDomainMapping();

    this.constructorName = name;
    this.constructorArgs = args;
    this.api = api;
    this.apigDomain = apigDomain;
    this.apiMapping = apiMapping;
    this.logGroup = logGroup;

    this.registerOutputs({
      _hint: this.url,
    });

    function normalizeAccessLog() {
      return output(args.accessLog).apply((accessLog) => ({
        ...accessLog,
        retention: accessLog?.retention ?? "forever",
      }));
    }

    function normalizeDomain() {
      if (!args.domain) return;

      // validate
      output(args.domain).apply((domain) => {
        if (typeof domain === "string") return;

        if (!domain.name) throw new Error(`Missing "name" for domain.`);
        if (domain.dns === false && !domain.cert)
          throw new Error(`No "cert" provided for domain with disabled DNS.`);
      });

      // normalize
      return output(args.domain).apply((domain) => {
        const norm = typeof domain === "string" ? { name: domain } : domain;

        return {
          name: norm.name,
          path: norm.path,
          dns: norm.dns === false ? undefined : norm.dns ?? awsDns(),
          cert: norm.cert,
        };
      });
    }

    function createApi() {
      return new apigatewayv2.Api(
        `${name}Api`,
        transform(args.transform?.api, {
          protocolType: "HTTP",
          corsConfiguration: {
            allowCredentials: false,
            allowHeaders: ["*"],
            allowMethods: ["*"],
            allowOrigins: ["*"],
          },
        }),
        { parent },
      );
    }

    function createLogGroup() {
      return new cloudwatch.LogGroup(
        `${name}AccessLog`,
        transform(args.transform?.accessLog, {
          name: `/aws/vendedlogs/apis/${prefixName(64, name)}`,
          retentionInDays: accessLog.apply(
            (accessLog) => RETENTION[accessLog.retention],
          ),
        }),
        { parent },
      );
    }

    function createStage() {
      new apigatewayv2.Stage(
        `${name}Stage`,
        transform(args.transform?.stage, {
          apiId: api.id,
          autoDeploy: true,
          name: "$default",
          accessLogSettings: {
            destinationArn: logGroup.arn,
            format: JSON.stringify({
              // request info
              requestTime: `"$context.requestTime"`,
              requestId: `"$context.requestId"`,
              httpMethod: `"$context.httpMethod"`,
              path: `"$context.path"`,
              routeKey: `"$context.routeKey"`,
              status: `$context.status`, // integer value, do not wrap in quotes
              responseLatency: `$context.responseLatency`, // integer value, do not wrap in quotes
              // integration info
              integrationRequestId: `"$context.integration.requestId"`,
              integrationStatus: `"$context.integration.status"`,
              integrationLatency: `"$context.integration.latency"`,
              integrationServiceStatus: `"$context.integration.integrationStatus"`,
              // caller info
              ip: `"$context.identity.sourceIp"`,
              userAgent: `"$context.identity.userAgent"`,
              //cognitoIdentityId:`"$context.identity.cognitoIdentityId"`, // not supported in us-west-2 region
            }),
          },
        }),
        { parent },
      );
    }

    function createSsl() {
      if (!domain) return;

      return domain.apply((domain) => {
        if (domain.cert) return output(domain.cert);

        return new DnsValidatedCertificate(
          `${name}Ssl`,
          {
            domainName: domain.name,
            dns: domain.dns!,
          },
          { parent },
        ).arn;
      });
    }

    function createDomainName() {
      if (!domain || !certificateArn) return;

      return new apigatewayv2.DomainName(
        `${name}DomainName`,
        transform(args.transform?.domainName, {
          domainName: domain?.name,
          domainNameConfiguration: {
            certificateArn,
            endpointType: "REGIONAL",
            securityPolicy: "TLS_1_2",
          },
        }),
        { parent },
      );
    }

    function createDnsRecords(): void {
      if (!domain || !apigDomain) {
        return;
      }

      domain.dns.apply((dns) => {
        if (!dns) return;

        if (dns.provider === "aws") {
          dns.createAliasRecords(
            name,
            {
              name: domain.name,
              aliasName: apigDomain.domainNameConfiguration.targetDomainName,
              aliasZone: apigDomain.domainNameConfiguration.hostedZoneId,
            },
            { parent },
          );
        } else {
          dns.createRecord(
            name,
            {
              type: "CNAME",
              name: domain.name,
              value: apigDomain.domainNameConfiguration.targetDomainName,
            },
            { parent },
          );
        }
      });
    }

    function createDomainMapping() {
      if (!domain || !apigDomain) return;

      return domain.path?.apply(
        (path) =>
          new apigatewayv2.ApiMapping(
            `${name}DomainMapping`,
            {
              apiId: api.id,
              domainName: apigDomain.id,
              stage: "$default",
              apiMappingKey: path,
            },
            { parent },
          ),
      );
    }
  }

  /**
   * The URL of the API.
   *
   * If the `domain` is set, this is the URL with the custom domain.
   * Otherwise, it's the autogenerated API Gateway URL.
   */
  public get url() {
    // Note: If mapping key is set, the URL needs a trailing slash. Without the
    //       trailing slash, the API fails with the error {"message":"Not Found"}
    return this.apigDomain && this.apiMapping
      ? all([this.apigDomain.domainName, this.apiMapping.apiMappingKey]).apply(
          ([domain, key]) =>
            key ? `https://${domain}/${key}/` : `https://${domain}`,
        )
      : this.api.apiEndpoint;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon API Gateway HTTP API
       */
      api: this.api,
      /**
       * The CloudWatch LogGroup for the access logs.
       */
      logGroup: this.logGroup,
    };
  }

  /**
   * Add a route to the API Gateway HTTP API. The route is a combination of
   * - An HTTP method and a path, `{METHOD} /{path}`.
   * - Or a `$default` route.
   *
   * :::tip
   * The `$default` route is a default or catch-all route. It'll match if no other route matches.
   * :::
   *
   * A method could be one of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, or `ANY`. Here `ANY` matches any HTTP method.
   *
   * The path can be a combination of
   * - Literal segments, `/notes`, `/notes/new`, etc.
   * - Parameter segments, `/notes/{noteId}`, `/notes/{noteId}/attachments/{attachmentId}`, etc.
   * - Greedy segments, `/{proxy+}`, `/notes/{proxy+}`,  etc. The `{proxy+}` segment is a greedy segment that matches all child paths. It needs to be at the end of the path.
   *
   * :::tip
   * The `{proxy+}` is a greedy segment, it matches all its child paths.
   * :::
   *
   * The `$default` is a reserved keyword for the default route. It'll be matched if no other route matches.
   *
   * :::note
   * You cannot have duplicate routes.
   * :::
   *
   * When a request comes in, the API Gateway will look for the most specific match. If no route matches, the `$default` route will be invoked.
   *
   * @param route The path for the route.
   * @param handler The function that'll be invoked.
   * @param args Configure the route.
   *
   * @example
   * Here's how you add a simple route.
   *
   * ```js
   * api.route("GET /", "src/get.handler");
   * ```
   *
   * Match any HTTP method.
   *
   * ```js
   * api.route("ANY /", "src/route.handler");
   * ```
   *
   * Add a default route.
   *
   * ```js
   * api.route("GET /", "src/get.handler")
   * api.route($default, "src/default.handler");
   * ```
   *
   * Add a parameterized route.
   *
   * ```js
   * api.route("GET /notes/{id}", "src/get.handler");
   * ```
   *
   * Add a greedy route.
   *
   * ```js
   * api.route("GET /notes/{proxy+}", "src/greedy.handler");
   * ```
   *
   * Enable auth for a route.
   *
   * ```js
   * api.route("GET /", "src/get.handler")
   * api.route("POST /", "src/post.handler", {
   *   auth: {
   *     iam: true
   *   }
   * });
   * ```
   *
   * Customize the route handler.
   *
   * ```js
   * api.route("GET /", {
   *   handler: "src/get.handler",
   *   memory: "2048 MB"
   * });
   * ```
   */
  public route(
    route: string,
    handler: string | FunctionArgs,
    args: ApiGatewayV2RouteArgs = {},
  ) {
    const routeNormalized = parseRoute();
    const prefix = this.constructorName;
    const suffix = sanitizeToPascalCase(
      hashStringToPrettyString([this.api.id, routeNormalized].join(""), 6),
    );

    return new ApiGatewayV2LambdaRoute(`${prefix}Route${suffix}`, {
      api: {
        name: prefix,
        id: this.api.id,
        executionArn: this.api.executionArn,
      },
      route: routeNormalized,
      handler,
      handlerTransform: this.constructorArgs.transform?.route?.handler,
      ...transform(this.constructorArgs.transform?.route?.args, args),
    });

    function parseRoute() {
      if (route.toLowerCase() === "$default") return "$default";

      const parts = route.split(" ");
      if (parts.length !== 2) {
        throw new VisibleError(
          `Invalid route ${route}. A route must be in the format "METHOD /path".`,
        );
      }
      const [methodRaw, path] = route.split(" ");
      const method = methodRaw.toUpperCase();
      if (
        ![
          "ANY",
          "DELETE",
          "GET",
          "HEAD",
          "OPTIONS",
          "PATCH",
          "POST",
          "PUT",
        ].includes(method)
      )
        throw new VisibleError(`Invalid method ${methodRaw} in route ${route}`);

      if (!path.startsWith("/"))
        throw new VisibleError(
          `Invalid path ${path} in route ${route}. Path must start with "/".`,
        );

      return `${method} ${path}`;
    }
  }

  /**
   * Add an authorizer to the API Gateway HTTP API.
   *
   * @param args Configure the authorizer.
   * @example
   * Here's how you add a JWT authorizer.
   *
   * ```js
   * api.addAuthorizer({
   *   name: "myAuthorizer",
   *   jwt: {
   *     issuer: "https://issuer.com/",
   *     audiences: ["https://api.example.com"],
   *     identitySource: "$request.header.AccessToken"
   *   }
   * });
   * ```
   */
  public addAuthorizer(args: ApiGatewayV2AuthorizerArgs) {
    const self = this;
    const selfName = this.constructorName;
    const nameSuffix = sanitizeToPascalCase(args.name);

    return new ApiGatewayV2Authorizer(`${selfName}Authorizer${nameSuffix}`, {
      api: {
        id: self.api.id,
        name: selfName,
      },
      ...args,
    });
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV2";
// @ts-expect-error
ApiGatewayV2.__pulumiType = __pulumiType;
