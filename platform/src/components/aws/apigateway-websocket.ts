import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component, Prettify, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs } from "./function";
import {
  hashStringToPrettyString,
  prefixName,
  sanitizeToPascalCase,
} from "../naming";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { RETENTION } from "./logging";
import { dns as awsDns } from "./dns.js";
import { ApiGatewayV2DomainArgs } from "./helpers/apigatewayv2-domain";
import { ApiGatewayWebSocketRoute } from "./apigateway-websocket-route";
import { setupApiGatewayAccount } from "./helpers/apigateway-account";
import { apigatewayv2, cloudwatch } from "@pulumi/aws";
import { permission } from "./permission";

export interface ApiGatewayWebSocketArgs {
  /**
   * Set a custom domain for your WebSocket API.
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
     * Transform the API Gateway WebSocket API resource.
     */
    api?: Transform<apigatewayv2.ApiArgs>;
    /**
     * Transform the API Gateway WebSocket API stage resource.
     */
    stage?: Transform<apigatewayv2.StageArgs>;
    /**
     * Transform the API Gateway WebSocket API domain name resource.
     */
    domainName?: Transform<apigatewayv2.DomainNameArgs>;
    /**
     * Transform the CloudWatch LogGroup resource used for access logs.
     */
    accessLog?: Transform<cloudwatch.LogGroupArgs>;
    /**
     * Transform the routes. This can be used to customize the handler function and
     * the arguments for each route.
     *
     * @example
     * ```js
     * {
     *   transform: {
     *     route: {
     *       handler: {
     *         link: [bucket, stripeKey]
     *       },
     *       args: {
     *         auth: { iam: true }
     *       }
     *     }
     *   }
     * }
     * ```
     */
    route?: {
      /**
       * Transform the handler function for the route.
       */
      handler?: Transform<FunctionArgs>;
      /**
       * Transform the arguments for the route.
       */
      args?: Transform<ApiGatewayWebSocketRouteArgs>;
    };
  };
}

export interface ApiGatewayWebSocketRouteArgs {
  /**
   * Enable auth for your WebSocket API.
   *
   * :::note
   * Currently only IAM auth is supported.
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
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the API Gateway WebSocket API integration resource.
     */
    integration?: Transform<apigatewayv2.IntegrationArgs>;
    /**
     * Transform the API Gateway WebSocket API route resource.
     */
    route?: Transform<apigatewayv2.RouteArgs>;
  };
}

/**
 * The `ApiGatewayWebSocket` component lets you add an [Amazon API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html) to your app.
 *
 * @example
 *
 * #### Create the API
 *
 * ```ts title="sst.config.ts"
 * const api = new sst.aws.ApiGatewayWebSocket("MyApi");
 * ```
 *
 * #### Add a custom domain
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.ApiGatewayWebSocket("MyApi", {
 *   domain: "api.example.com"
 * });
 * ```
 *
 * #### Add routes
 *
 * ```ts title="sst.config.ts"
 * api.route("$connect", "src/connect.handler");
 * api.route("$disconnect", "src/disconnect.handler");
 * api.route("$default", "src/default.handler");
 * api.route("sendMessage", "src/sendMessage.handler");
 * ```
 */
export class ApiGatewayWebSocket extends Component implements Link.Linkable {
  private constructorName: string;
  private constructorArgs: ApiGatewayWebSocketArgs;
  private api: apigatewayv2.Api;
  private stage: apigatewayv2.Stage;
  private apigDomain?: apigatewayv2.DomainName;
  private apiMapping?: Output<apigatewayv2.ApiMapping>;
  private logGroup: cloudwatch.LogGroup;

  constructor(
    name: string,
    args: ApiGatewayWebSocketArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const accessLog = normalizeAccessLog();
    const domain = normalizeDomain();

    const apigAccount = setupApiGatewayAccount(name);
    const api = createApi();
    const logGroup = createLogGroup();
    const stage = createStage();

    const certificateArn = createSsl();
    const apigDomain = createDomainName();
    createDnsRecords();
    const apiMapping = createDomainMapping();

    this.constructorName = name;
    this.constructorArgs = args;
    this.api = api;
    this.stage = stage;
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
          protocolType: "WEBSOCKET",
          routeSelectionExpression: "$request.body.action",
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
      return new apigatewayv2.Stage(
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
              eventType: `"$context.eventType"`,
              routeKey: `"$context.routeKey"`,
              status: `$context.status`, // integer value, do not wrap in quotes
              // integration info
              integrationRequestId: `"$context.awsEndpointRequestId"`,
              integrationStatus: `"$context.integrationStatus"`,
              integrationLatency: `"$context.integrationLatency"`,
              integrationServiceStatus: `"$context.integration.integrationStatus"`,
              // caller info
              ip: `"$context.identity.sourceIp"`,
              userAgent: `"$context.identity.userAgent"`,
              //cognitoIdentityId:`"$context.identity.cognitoIdentityId"`, // not supported in us-west-2 region
              connectedAt: `"$context.connectedAt"`,
              connectionId: `"$context.connectionId"`,
            }),
          },
        }),
        { parent, dependsOn: apigAccount },
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
            key ? `wss://${domain}/${key}/` : `wss://${domain}`,
        )
      : interpolate`${this.api.apiEndpoint}/${this.stage.name}`;
  }

  /**
   * The management endpoint for the API used by the API Gateway Management API client.
   * This is useful for sending messages to connected clients.
   *
   * @example
   * ```js
   * import { Resource } from "sst";
   * import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
   *
   * const client = new ApiGatewayManagementApiClient({
   *   endpoint: Resource.MyApi.managementEndpoint,
   * });
   * ```
   */
  public get managementEndpoint() {
    // ie. https://v1lmfez2nj.execute-api.us-east-1.amazonaws.com/$default
    return this.api.apiEndpoint.apply(
      (endpoint) =>
        interpolate`${endpoint.replace("wss", "https")}/${this.stage.name}`,
    );
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon API Gateway V2 API.
       */
      api: this.api,
      /**
       * The CloudWatch LogGroup for the access logs.
       */
      logGroup: this.logGroup,
    };
  }

  /**
   * Add a route to the API Gateway WebSocket API.
   *
   * There are three predefined routes:
   * - `$connect`: When the client connects to the API.
   * - `$disconnect`: When the client or the server disconnects from the API.
   * - `$default`: The default or catch-all route.
   *
   * In addition, you can create custom routes. When a request comes in, the API Gateway
   * will look for the specific route defined by the user. If no route matches, the `$default`
   * route will be invoked.
   *
   * @param route The path for the route.
   * @param handler The function that'll be invoked.
   * @param args Configure the route.
   *
   * @example
   * Add a simple route.
   *
   * ```js title="sst.config.ts"
   * api.route("sendMessage", "src/sendMessage.handler");
   * ```
   *
   * Add a predefined route.
   *
   * ```js title="sst.config.ts"
   * api.route("$default", "src/default.handler");
   * ```
   *
   * Enable auth for a route.
   *
   * ```js title="sst.config.ts"
   * api.route("sendMessage", "src/sendMessage.handler", {
   *   auth: {
   *     iam: true
   *   }
   * });
   * ```
   *
   * Customize the route handler.
   *
   * ```js title="sst.config.ts"
   * api.route("sendMessage", {
   *   handler: "src/sendMessage.handler",
   *   memory: "2048 MB"
   * });
   * ```
   */
  public route(
    route: string,
    handler: string | FunctionArgs,
    args: ApiGatewayWebSocketRouteArgs = {},
  ) {
    const prefix = this.constructorName;
    const suffix = sanitizeToPascalCase(
      ["$connect", "$disconnect", "$default"].includes(route)
        ? route
        : hashStringToPrettyString(`${this.api.id}${route}`, 6),
    );

    return new ApiGatewayWebSocketRoute(`${prefix}Route${suffix}`, {
      api: {
        name: prefix,
        id: this.api.id,
        executionArn: this.api.executionArn,
      },
      route,
      handler,
      handlerTransform: this.constructorArgs.transform?.route?.handler,
      ...transform(this.constructorArgs.transform?.route?.args, args),
    });
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
        managementEndpoint: this.managementEndpoint,
      },
      include: [
        permission({
          actions: ["execute-api:ManageConnections"],
          resources: [interpolate`${this.api.executionArn}/*/*/@connections/*`],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayWebSocket";
// @ts-expect-error
ApiGatewayWebSocket.__pulumiType = __pulumiType;
