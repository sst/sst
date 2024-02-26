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
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming";
import { VisibleError } from "../error";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { useProvider } from "./helpers/provider";

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
   * `app.domain.com`, the hosted zone might be `domain.com`. So you'll need to pass in the
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
   *     domainName: "app.domain.com",
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
   *     domainName: "domain.com",
   *     hostedZoneId: "Z2FDTNDATAQYW2"
   *   }
   * }
   * ```
   */
  hostedZoneId?: Input<string>;
  /**
   * The base mapping for the custom domain.
   *
   * For example, by setting the domainName to api.domain.com and the path to v1, the custom domain URL of the API will become https://api.domain.com/v1/. If the path is not set, the custom domain URL will be https://api.domain.com. Note the additional trailing slash in the former case.
   */
  path?: string;
}

export interface ApiGatewayHttpApiArgs {
  /**
   * Set a custom domain for your Next.js app. Supports domains hosted either on
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
   *   domain: "domain.com"
   * }
   * ```
   *
   * Specify the Route 53 hosted zone and a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     domainName: "domain.com",
   *     hostedZone: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<DomainArgs>>;
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
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
  };
}

export interface ApiGatewayHttpApiRouteArgs {
  /**
   * Controlling and managing access to your HTTP API.
   */
  auth?: Input<{
    /**
     * enable IAM authorization for HTTP API routes. When IAM authorization is enabled, clients must use Signature Version 4 to sign their requests with AWS credentials.
     */
    iam?: Input<true>;
  }>;
  /**
   * [Transform](/docs/components#transform/) how this subscription creates its underlying
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
  };
}

/**
 * The `ApiGatewayHttpApi` component lets you add an [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.htmll) to your app.
 *
 * @example
 *
 * #### Create an API
 *
 * ```ts
 * const myApi = new sst.aws.ApiGatewayHttpApi("MyApi");
 * myApi
 *  .route("GET /", "src/get.handler")
 *  .route("POST /", "src/post.handler");
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your API.
 *
 * ```js {2}
 * const myApi = new sst.aws.ApiGatewayHttpApi("MyApi");
 *   domain: "api.my-app.com"
 * });
 * ```
 */
export class ApiGatewayHttpApi extends Component implements Link.Linkable {
  private constructorName: string;
  private api: aws.apigatewayv2.Api;
  private apigDomain?: aws.apigatewayv2.DomainName;
  private apiMapping?: Output<aws.apigatewayv2.ApiMapping>;

  constructor(
    name: string,
    args: ApiGatewayHttpApiArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:aws:ApiGatewayHttpApi", name, args, opts);

    const parent = this;

    const domain = normalizeDomain();

    const api = createApi();
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

    function createStage() {
      new aws.apigatewayv2.Stage(
        `${name}Stage`,
        transform(args.transform?.stage, {
          apiId: api.id,
          autoDeploy: true,
          name: "$default",
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
   * Add a route to the API Gateway HTTP API.
   * @param path The path for the route.
   * @param subscriber The function that'll be invoked.
   * @param args Configure the route.
   *
   * @example
   *
   * ```js
   * myApi.route("GET /", "src/get.handler");
   * ```
   *
   * Add multiple routes.
   *
   * ```js
   * myApi
   *   .route("GET /", "src/get.handler")
   *   .route("POST /", "src/post.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * myApi.route("GET /", "src/get.handler", {
   * });
   * ```
   *
   * Customize the route function.
   *
   * ```js
   * myApi.route("GET /", {
   *   handler: "src/get.handler",
   *   memory: "2048 MB"
   * });
   * ```
   */
  public route(
    route: string,
    subscriber: string | FunctionArgs,
    args: ApiGatewayHttpApiRouteArgs = {},
  ) {
    const parent = this;
    const parentName = this.constructorName;
    const routeKey = this.parseRoute(route);

    // Build route name
    const id = sanitizeToPascalCase(hashStringToPrettyString(routeKey, 4));

    const fn = Function.fromDefinition(
      parent,
      `${parentName}Handler${id}`,
      subscriber,
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
    new aws.apigatewayv2.Route(
      `${parentName}Route${id}`,
      transform(args.transform?.route, {
        apiId: this.api.id,
        routeKey,
        target: interpolate`integrations/${integration.id}`,
        authorizationType: output(args.auth).apply((auth) =>
          auth?.iam ? "AWS_IAM" : "NONE",
        ),
      }),
      { parent },
    );
    return this;
  }

  private parseRoute(route: string) {
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

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
    };
  }
}
