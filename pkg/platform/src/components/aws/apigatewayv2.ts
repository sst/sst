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
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { RETENTION } from "./logging";
import { dns as awsDns } from "./dns.js";
import { Dns } from "../dns";

interface DomainArgs {
  /**
   * The custom domain you want to use.
   *
   * @example
   * ```js
   * {
   *   domain: {
   *     name: "example.com"
   *   }
   * }
   * ```
   *
   * Can also include subdomains based on the current stage.
   *
   * ```js
   * {
   *   domain: {
   *     name: `${$app.stage}.example.com`
   *   }
   * }
   * ```
   */
  name: Input<string>;
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
   *     name: "api.example.com",
   *     path: "v1"
   *   }
   * }
   * ```
   *
   * The full URL of the API will be `https://api.example.com/v1/`.
   *
   * :::note
   * There's an extra trailing slash when a base path is set.
   * :::
   *
   * Be default there is no base path, so if the `name` is `api.example.com`, the full URL will be `https://api.example.com`.
   */
  path?: Input<string>;
  /**
   * The ARN of an ACM (AWS Certificate Manager) certificate that proves ownership of the
   * domain. By default, a certificate is created and validated automatically.
   *
   * :::tip
   * You need to pass in a `cert` for domains that are not hosted on supported `dns` providers.
   * :::
   *
   * To manually set up a domain on an unsupported provider, you'll need to:
   *
   * 1. [Validate that you own the domain](https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html) by creating an ACM certificate. You can either validate it by setting a DNS record or by verifying an email sent to the domain owner.
   * 2. Once validated, set the certificate ARN as the `cert` and set `dns` to `false`.
   * 3. Add the DNS records in your provider to point to the API Gateway URL.
   *
   * @example
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: false,
   *     cert: "arn:aws:acm:us-east-1:112233445566:certificate/3a958790-8878-4cdc-a396-06d95064cf63"
   *   }
   * }
   * ```
   */
  cert?: Input<string>;
  /**
   * The DNS provider to use for the domain. Defaults to the AWS.
   *
   * Takes an adapter that can create the DNS records on the provider. This can automate 
   * validating the domain and setting up the DNS routing.
   *
   * Supports Route 53, Cloudflare, and Vercel adapters. For other providers, you'll need
   * to set `dns` to `false` and pass in a certificate validating ownership via `cert`.
   *
   * @default `sst.aws.dns`
   *
   * @example
   *
   * Specify the hosted zone ID for the Route 53 domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: sst.aws.dns({
   *       zone: "Z2FDTNDATAQYW2"
   *     })
   *   }
   * }
   * ```
   *
   * Use a domain hosted on Cloudflare, needs the Cloudflare provider.
   *
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: sst.cloudflare.dns()
   *   }
   * }
   * ```
   *
   * Use a domain hosted on Vercel, needs the Vercel provider.
   *
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: sst.vercel.dns()
   *   }
   * }
   * ```
   */
  dns?: Input<false | (Dns & {})>;
}

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
  domain?: Input<string | Prettify<DomainArgs>>;
  /**
   * Configure the [API Gateway logs](https://docs.aws.amazon.com/apigateway/latest/developerguide/view-cloudwatch-log-events-in-cloudwatch-console.html) in CloudWatch. By default, access logs are enabled and kept forever.
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

export interface ApiGatewayV2Route {
  /**
   * The Lambda function.
   */
  function: Output<Function>;
  /**
   * The Lambda permission.
   */
  permission: aws.lambda.Permission;
  /**
   * The API Gateway HTTP API integration.
   */
  integration: aws.apigatewayv2.Integration;
  /**
   * The API Gateway HTTP API route.
   */
  route: Output<aws.apigatewayv2.Route>;
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

      return new aws.apigatewayv2.DomainName(
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
  ): ApiGatewayV2Route {
    const source = this;
    const sourceName = this.constructorName;
    const routeKey = parseRoute();

    // Build route name
    const id = sanitizeToPascalCase(
      hashStringToPrettyString([this.api.id, routeKey].join(""), 4),
    );

    const fn = Function.fromDefinition(`${sourceName}Handler${id}`, handler, {
      description: `${sourceName} route ${routeKey}`,
    });
    const permission = new aws.lambda.Permission(
      `${sourceName}Handler${id}Permissions`,
      {
        action: "lambda:InvokeFunction",
        function: fn.arn,
        principal: "apigateway.amazonaws.com",
        sourceArn: interpolate`${this.nodes.api.executionArn}/*`,
      },
    );
    const integration = new aws.apigatewayv2.Integration(
      `${sourceName}Integration${id}`,
      transform(args.transform?.integration, {
        apiId: this.api.id,
        integrationType: "AWS_PROXY",
        integrationUri: fn.arn,
        payloadFormatVersion: "2.0",
      }),
      { dependsOn: [permission] },
    );
    const authArgs = createAuthorizer();

    const apiRoute = authArgs.apply(
      (authArgs) =>
        new aws.apigatewayv2.Route(
          `${sourceName}Route${id}`,
          transform(args.transform?.route, {
            apiId: this.api.id,
            routeKey,
            target: interpolate`integrations/${integration.id}`,
            ...authArgs,
          }),
        ),
    );
    return { function: fn, permission, integration, route: apiRoute };

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
            source.authorizers[id] ??
            new aws.apigatewayv2.Authorizer(
              `${sourceName}Authorizer${id}`,
              transform(args.transform?.authorizer, {
                apiId: source.api.id,
                authorizerType: "JWT",
                identitySources: [
                  auth.jwt.identitySource ?? "$request.header.Authorization",
                ],
                jwtConfiguration: {
                  audiences: auth.jwt.audiences,
                  issuer: auth.jwt.issuer,
                },
              }),
            );
          source.authorizers[id] = authorizer;

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

const __pulumiType = "sst:aws:ApiGatewayV2";
// @ts-expect-error
ApiGatewayV2.__pulumiType = __pulumiType;
