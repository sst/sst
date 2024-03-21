import { ComponentResourceOptions, all, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Prettify, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Cdn, CdnDomainArgs } from "./cdn";

export interface RouterArgs {
  /**
   * Set a custom domain for your Router. Supports domains hosted either on
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
  domain?: Input<string | Prettify<CdnDomainArgs>>;
  /**
   * A map of routes to their destinations. The _key_ is the route path and the
   * _value_ is the destination URL. All routes need to start with `/`.
   *
   * When router receives a request, the requested path is compared with path patterns
   * in the order they are listed. The first match determines which URL the
   * request is routed to.
   *
   * :::tip[Default Route]
   * The `/*` route is a default or catch-all route.
   * :::
   *
   *  The `/*` route is a _default_ route, meaning that if no routes match, the `/*` route will be used. It does not matter where the `/*` route is listed in the routes object.
   *
   * :::note
   * If you don't have a `/*` route, you'll get a 404 error for any requests that don't match a route.
   * :::
   *
   * @example
   *
   * Suppose you have the following three routes.
   *
   * ```js
   * {
   *   routes: {
   *     "/api/*.json": "example1.com",
   *     "/api/*": "example2.com",
   *     "/*.xml": "example3.com",
   * }
   * ```
   *
   * A request to `/api/sample.xml` will match `/api/*` first and route to it; even though it matches `/*.xml`.
   *
   *  However for this case, a request to `/api/users` will route to `/api/*` even though it comes after `/*`. This is because the `/*` route is the default route.
   *
   * ```js
   * {
   *   routes: {
   *     "/*": "myapp.com",
   *     "/api/*": function.url
   *   }
   * }
   * ```
   */
  routes: Input<Record<string, Input<string>>>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cache Policy that's attached to each CloudFront behavior.
     */
    cachePolicy?: Transform<aws.cloudfront.CachePolicyArgs>;
  };
}

/**
 * The `Router` component lets you use a CloudFront distribution to route requests to different
 * parts of your app.
 *
 * You can use this the `routes` to route to function URLs, other domains, or any component that has a URL.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": "some-internal-service.com"
 *   }
 * });
 * ```
 *
 * #### Route to a function URL
 *
 * ```ts
 * const function = new sst.aws.Function("MyFunction", {
 *   handler: "src/api.handler",
 *   url: true,
 * });
 *
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": function.url
 *   }
 * });
 * ```
 *
 * #### Route all API requests separately
 *
 * ```ts {4}
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": "myapp.com",
 *     "/api/*": function.url
 *   }
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * ```ts {2}
 * new sst.aws.Router("MyRouter", {
 *   domain: "myapp.com",
 *   routes: {
 *     "/*": function.url
 *   }
 * });
 * ```
 */
export class Router extends Component implements Link.Linkable {
  private cdn: Cdn;
  private cachePolicy: aws.cloudfront.CachePolicy;

  constructor(
    name: string,
    args: RouterArgs,
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:aws:Router", name, args, opts);

    const parent = this;

    validateRoutes();

    const cachePolicy = createCachePolicy();
    const cdn = createCdn();

    this.cachePolicy = cachePolicy;
    this.cdn = cdn;

    function validateRoutes() {
      output(args.routes).apply((routes) => {
        Object.keys(routes).map((path) => {
          if (!path.startsWith("/")) {
            throw new Error(
              `In "${name}" Router, the route path "${path}" must start with a "/"`,
            );
          }
        });
      });
    }

    function createCachePolicy() {
      return new aws.cloudfront.CachePolicy(
        `${name}CachePolicy`,
        transform(args.transform?.cachePolicy, {
          comment: `${name} router cache policy`,
          defaultTtl: 0,
          maxTtl: 31536000, // 1 year
          minTtl: 0,
          parametersInCacheKeyAndForwardedToOrigin: {
            cookiesConfig: {
              cookieBehavior: "none",
            },
            headersConfig: {
              headerBehavior: "none",
            },
            queryStringsConfig: {
              queryStringBehavior: "all",
            },
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
          },
        }),
        { parent },
      );
    }

    function createCdn() {
      const origins = buildOrigins();
      const behaviors = buildBehaviors();

      return new Cdn(
        `${name}Cdn`,
        {
          domain: args.domain,
          wait: true,
          transform: {
            distribution: (distribution) => ({
              ...distribution,
              comment: `${name} router`,
              origins,
              defaultCacheBehavior: behaviors.apply(
                (behaviors) => behaviors.find((b) => !b.pathPattern)!,
              ),
              orderedCacheBehaviors: behaviors.apply(
                (behaviors) =>
                  behaviors.filter(
                    (b) => b.pathPattern,
                  ) as aws.types.input.cloudfront.DistributionOrderedCacheBehavior[],
              ),
            }),
          },
        },
        { parent },
      );
    }

    function buildOrigins() {
      const defaultConfig = {
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 20,
          originSslProtocols: ["TLSv1.2"],
        },
      };

      return output(args.routes).apply((routes) => {
        const origins = Object.entries(routes).map(([path, url]) => ({
          originId: path,
          domainName: new URL(url).host,
          ...defaultConfig,
        }));

        if (!routes["/*"]) {
          origins.push({
            originId: "/*",
            domainName: "do-not-exist",
            ...defaultConfig,
          });
        }
        return origins;
      });
    }

    function buildBehaviors() {
      const defaultConfig = {
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: [
          "DELETE",
          "GET",
          "HEAD",
          "OPTIONS",
          "PATCH",
          "POST",
          "PUT",
        ],
        cachedMethods: ["GET", "HEAD"],
        defaultTtl: 0,
        compress: true,
        // CloudFront's Managed-AllViewerExceptHostHeader policy
        cachePolicyId: cachePolicy.id,
        originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
      };

      return output(args.routes).apply((routes) => {
        const behaviors = Object.entries(routes).map(([path]) => ({
          ...(path === "/*" ? {} : { pathPattern: path }),
          targetOriginId: path,
          ...defaultConfig,
        }));

        if (!routes["/*"]) {
          behaviors.push({
            targetOriginId: "/*",
            ...defaultConfig,
          });
        }
        return behaviors;
      });
    }
  }

  /**
   * The URL of the Router.
   *
   * If the `domain` is set, this is the URL with the custom domain.
   * Otherwise, it's the autogenerated CloudFront URL.
   */
  public get url() {
    return all([this.cdn.domainUrl, this.cdn.url]).apply(
      ([domainUrl, url]) => domainUrl ?? url,
    );
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
