import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Prettify, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import {
  hashStringToPrettyString,
  prefixName,
  sanitizeToPascalCase,
} from "../naming";
import { VisibleError } from "../error";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { Hint } from "../hint";
import { RETENTION } from "./logging";

interface DomainArgs {
  /**
   * The custom domain you want to use. Supports domains hosted on [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   * @example
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   */
  domainName: Input<string>;
  /**
   * Name of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone name in the Route 53 part of the AWS Console.

   *
   * Usually your domain name is in a hosted zone with the same name. For example,
   * `domain.com` might be in a hosted zone also called `domain.com`. So by default, SST will
   * look for a hosted zone that matches the `domainName`.
   *
   * There are cases where these might not be the same. For example, if you use a subdomain,
   * `api.domain.com`, the hosted zone might be `domain.com`. So you'll need to pass in the
   * hosted zone name.
   *
   * :::note
   * If both the `hostedZone` and `hostedZoneId` are set, `hostedZoneId` will take precedence.
   * :::
   *
   * @default Same as the `domainName`
   * @example
   * ```js {4}
   * {
   *   domain: {
   *     domainName: "api.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * }
   * ```
   */
  hostedZone?: Input<string>;
  /**
   * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
   *
   * This option is useful for cases where you have multiple hosted zones that have the same
   * domain.
   *
   * :::note
   * If both the `hostedZone` and `hostedZoneId` are set, `hostedZoneId` will take precedence.
   * :::
   *
   * @example
   * ```js {4}
   * {
   *   domain: {
   *     domainName: "api.domain.com",
   *     hostedZoneId: "Z2FDTNDATAQYW2"
   *   }
   * }
   * ```
   */
  hostedZoneId?: Input<string>;
  /**
   * The base mapping for the custom domain. This adds a suffix to the URL of the API.
   *
   * @example
   *
   * Given the following base path and domain name.
   *
   * ```js
   * {
   *   domain: {
   *     domainName: "api.domain.com",
   *     path: "v1"
   *   }
   * }
   * ```
   *
   * The full URL of the API will be `https://api.domain.com/v1/`.
   *
   * :::note
   * There's an extra trailing slash when a base path is set.
   * :::
   *
   * Be default there is no base path, so if the `domainName` is `api.domain.com`, the full URL will be `https://api.domain.com`.
   */
  path?: string;
}

export interface ApiGatewayV2Args {
  /**
   * Set a custom domain for your HTTP API. Supports domains hosted either on
   * [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   *
   * :::tip
   * You can also migrate an externally hosted domain to Amazon Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   * :::
   *
   * @example
   *
   * ```js
   * {
   *   domain: "api.domain.com"
   * }
   * ```
   *
   * Specify the Route 53 hosted zone.
   *
   * ```js
   * {
   *   domain: {
   *     domainName: "api.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<DomainArgs>>;
  /**
   * Configure the access logs in CloudWatch.
   * @default `&lcub;retention: "forever"&rcub;`
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
     * The duration the function logs are kept in CloudWatch.
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
    api?: Transform<aws.apigatewayv2.ApiArgs>;
    /**
     * Transform the API Gateway HTTP API stage resource.
     */
    stage?: Transform<aws.apigatewayv2.StageArgs>;
    /**
     * Transform the API Gateway HTTP API domain name resource.
     */
    domainName?: Transform<aws.apigatewayv2.DomainNameArgs>;
    /**
     * Transform the CloudWatch LogGroup resource used for access logs.
     */
    accessLog?: Transform<aws.cloudwatch.LogGroupArgs>;
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
     *       issuer: "https://issuer.com/",
     *       audiences: ["https://api.example.com"],
     *       scopes: ["read:profile", "write:profile"],
     *       identitySource: "$request.header.AccessToken"
     *     }
     *   }
     * }
     * ```
     *
     * You can also use Cognito as the identity provider.
     *
     * ```js
     * {
     *   auth: {
     *     jwt: {
     *       audiences: [userPoolClient.id],
     *       issuer: $interpolate`https://cognito-idp.${aws.getArnOutput(userPool).region}.amazonaws.com/${userPool.id}`,
     *     }
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
    jwt?: Input<{
      /**
       * Base domain of the identity provider that issues JSON Web Tokens.
       */
      issuer: Input<string>;
      /**
       * List of the intended recipients of the JWT. A valid JWT must provide an `aud` that matches at least one entry in this list.
       */
      audiences: Input<Input<string>[]>;
      /**
       * Defines the permissions or access levels that the JWT grants. If the JWT does not have the required scope, the request is rejected. By default it does not require any scopes.
       */
      scopes?: Input<Input<string>[]>;
      /**
       * Specifies where to extract the JWT from the request.
       * @default `"$request.header.Authorization"`
       */
      identitySource?: Input<string>;
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
    integration?: Transform<aws.apigatewayv2.IntegrationArgs>;
    /**
     * Transform the API Gateway HTTP API route resource.
     */
    route?: Transform<aws.apigatewayv2.RouteArgs>;
    /**
     * Transform the API Gateway authorizer resource.
     */
    authorizer?: Transform<aws.apigatewayv2.AuthorizerArgs>;
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
 *   domain: "api.domain.com"
 * });
 * ```
 *
 * #### Add routes
 *
 * ```ts
 * api
 *  .route("GET /", "src/get.handler")
 *  .route("POST /", "src/post.handler");
 * ```
 */
export class ApiGatewayV2 extends Component implements Link.Linkable {
  private constructorName: string;
  private api: aws.apigatewayv2.Api;
  private apigDomain?: aws.apigatewayv2.DomainName;
  private apiMapping?: Output<aws.apigatewayv2.ApiMapping>;
  private authorizers: Record<string, aws.apigatewayv2.Authorizer> = {};
  private logGroup: aws.cloudwatch.LogGroup;

  constructor(
    name: string,
    args: ApiGatewayV2Args = {},
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:aws:ApiGatewayV2", name, args, opts);

    const parent = this;

    const accessLog = normalizeAccessLog();
    const domain = normalizeDomain();

    const api = createApi();
    const logGroup = createLogGroup();
    createStage();

    const zoneId = lookupHostedZoneId();
    const certificate = createSsl();
    const apigDomain = createDomainName();
    createRoute53Records();
    const apiMapping = createDomainMapping();

    this.constructorName = name;
    this.api = api;
    this.apigDomain = apigDomain;
    this.apiMapping = apiMapping;
    this.logGroup = logGroup;

    Hint.register(this.urn, this.url);

    function normalizeAccessLog() {
      return output(args.accessLog).apply((accessLog) => ({
        ...accessLog,
        retention: accessLog?.retention ?? "forever",
      }));
    }

    function normalizeDomain() {
      if (!args.domain) return;

      return output(args.domain).apply((domain) => {
        if (typeof domain === "string") {
          return { domainName: domain };
        }

        if (!domain.domainName) {
          throw new Error(`Missing "domainName" for domain.`);
        }
        if (domain.hostedZone && domain.hostedZoneId) {
          throw new Error(`Do not set both "hostedZone" and "hostedZoneId".`);
        }
        return domain;
      });
    }

    function createApi() {
      return new aws.apigatewayv2.Api(
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
      return new aws.cloudwatch.LogGroup(
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
      new aws.apigatewayv2.Stage(
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

    function lookupHostedZoneId() {
      if (!domain) return;

      return domain.apply((domain) => {
        if (domain.hostedZoneId) return output(domain.hostedZoneId);

        return new HostedZoneLookup(
          `${name}HostedZoneLookup`,
          {
            domain: domain.hostedZone ?? domain.domainName,
          },
          { parent },
        ).zoneId;
      });
    }

    function createSsl() {
      if (!domain || !zoneId) return;

      return new DnsValidatedCertificate(
        `${name}Ssl`,
        {
          domainName: domain.domainName,
          zoneId,
        },
        { parent },
      );
    }

    function createDomainName() {
      if (!domain || !certificate) return;

      return new aws.apigatewayv2.DomainName(
        `${name}DomainName`,
        transform(args.transform?.domainName, {
          domainName: domain?.domainName,
          domainNameConfiguration: {
            certificateArn: certificate.arn,
            endpointType: "REGIONAL",
            securityPolicy: "TLS_1_2",
          },
        }),
        { parent },
      );
    }

    function createRoute53Records(): void {
      if (!domain || !zoneId || !apigDomain) {
        return;
      }

      domain.domainName.apply((domainName) => {
        for (const type of ["A", "AAAA"]) {
          new aws.route53.Record(
            `${name}${type}Record${sanitizeToPascalCase(domainName)}`,
            {
              name: domain.domainName,
              zoneId,
              type,
              aliases: [
                {
                  name: apigDomain.domainNameConfiguration.targetDomainName,
                  zoneId: apigDomain.domainNameConfiguration.hostedZoneId,
                  evaluateTargetHealth: true,
                },
              ],
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
          new aws.apigatewayv2.ApiMapping(
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
   * Add multiple routes.
   *
   * ```js
   * api
   *   .route("GET /", "src/get.handler")
   *   .route("POST /", "src/post.handler");
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
   * api
   *   .route("GET /", "src/get.handler")
   *   .route($default, "src/default.handler");
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
   * api
   *   .route("GET /", "src/get.handler")
   *   .route("POST /", "src/post.handler", {
   *     auth: {
   *       iam: true
   *     }
   *   });
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
    const parent = this;
    const parentName = this.constructorName;
    const routeKey = parseRoute();

    // Build route name
    const id = sanitizeToPascalCase(hashStringToPrettyString(routeKey, 4));

    const fn = Function.fromDefinition(
      parent,
      `${parentName}Handler${id}`,
      handler,
      {
        description: `${parentName} route ${routeKey}`,
      },
    );
    const permission = new aws.lambda.Permission(
      `${parentName}Handler${id}Permissions`,
      {
        action: "lambda:InvokeFunction",
        function: fn.arn,
        principal: "apigateway.amazonaws.com",
        sourceArn: interpolate`${this.nodes.api.executionArn}/*`,
      },
      { parent },
    );
    const integration = new aws.apigatewayv2.Integration(
      `${parentName}Integration${id}`,
      transform(args.transform?.integration, {
        apiId: this.api.id,
        integrationType: "AWS_PROXY",
        integrationUri: fn.arn,
        payloadFormatVersion: "2.0",
      }),
      { parent, dependsOn: [permission] },
    );
    const authArgs = createAuthorizer();

    authArgs.apply(
      (authArgs) =>
        new aws.apigatewayv2.Route(
          `${parentName}Route${id}`,
          transform(args.transform?.route, {
            apiId: this.api.id,
            routeKey,
            target: interpolate`integrations/${integration.id}`,
            ...authArgs,
          }),
          { parent },
        ),
    );
    return this;

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

    function createAuthorizer() {
      return output(args.auth).apply((auth) => {
        if (auth?.iam) return { authorizationType: "AWS_IAM" };
        if (auth?.jwt) {
          // Build authorizer name
          const id = sanitizeToPascalCase(
            hashStringToPrettyString(
              [
                auth.jwt.issuer,
                ...auth.jwt.audiences.sort(),
                auth.jwt.identitySource ?? "",
              ].join(""),
              4,
            ),
          );

          const authorizer =
            parent.authorizers[id] ??
            new aws.apigatewayv2.Authorizer(
              `${parentName}Authorizer${id}`,
              transform(args.transform?.authorizer, {
                apiId: parent.api.id,
                authorizerType: "JWT",
                identitySources: [
                  auth.jwt.identitySource ?? "$request.header.Authorization",
                ],
                jwtConfiguration: {
                  audiences: auth.jwt.audiences,
                  issuer: auth.jwt.issuer,
                },
              }),
              { parent },
            );
          parent.authorizers[id] = authorizer;

          return {
            authorizationType: "JWT",
            authorizationScopes: auth.jwt.scopes,
            authorizerId: authorizer.id,
          };
        }
        return {
          authorizationType: "NONE",
        };
      });
    }
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
