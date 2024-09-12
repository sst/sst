import { ComponentResourceOptions, all, output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Cdn, CdnArgs } from "./cdn";
import { cloudfront, types } from "@pulumi/aws";
import { hashStringToPrettyString } from "../naming";

export interface RouterArgs {
  /**
   * Set a custom domain for your Router.
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
   *
   * Specify a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: CdnArgs["domain"];
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
   * The `/*` route is a _default_ route, meaning that if no routes match, the `/*` route will be used. It does not matter where the `/*` route is listed in the routes object.
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
   *     "/api/*.json": "https://example1.com",
   *     "/api/*": "https://example2.com",
   *     "/*.xml": "https://example3.com",
   *   }
   * }
   * ```
   *
   * A request to `/api/sample.xml` will match `/api/*` first and route to it; even though it matches `/*.xml`.
   *
   * However for this case, a request to `/api/users` will route to `/api/*` even though it comes after `/*`. This is because the `/*` route is the default route.
   *
   * ```js
   * {
   *   routes: {
   *     "/*": "myapp.com",
   *     "/api/*": myFunction.url
   *   }
   * }
   * ```
   *
   * Customize the route behavior with CloudFront Functions.
   *
   * ```js
   * {
   *   routes: {
   *     "/api/*": {
   *       url: "https://example.com",
   *       edge: {
   *         viewerRequest: {
   *           injection: `event.request.headers["x-foo"] = "bar";`
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  routes: Input<
    Record<
      string,
      Input<
        | string
        | {
            /**
             * The destination URL.
             *
             * @example
             *
             * ```js
             * {
             *   routes: {
             *     "/api/*": {
             *       url: "https://example.com",
             *     }
             *   }
             * }
             * ```
             */
            url: Input<string>;
            /**
             * Configure CloudFront Functions to customize the behavior of HTTP requests and responses at the edge.
             */
            edge?: {
              /**
               * Configure the viewer request function.
               *
               * The viewer request function can be used to modify incoming requests before they reach
               * your origin server. For example, you can redirect users, rewrite URLs, or add headers.
               */
              viewerRequest?: Input<{
                /**
                 * Inject your code into the viewer request function.
                 *
                 * By default, a viewer request function is created to inject the `x-forwarded-host`
                 * header. The provided code will be injected at the end of the function.
                 *
                 * ```js
                 * function handler(event) {
                 *
                 *   // Default behavior code
                 *   ...
                 *
                 *   // User injected code
                 *   ...
                 *
                 *   return event.request;
                 * }
                 * ```
                 *
                 * @example
                 * Add a custom header to all requests
                 * ```js
                 * {
                 *   routes: {
                 *     "/api/*": {
                 *       edge: {
                 *         viewerRequest: {
                 *           injection: `event.request.headers["x-foo"] = "bar";`
                 *         }
                 *       }
                 *     }
                 * }
                 * ```
                 */
                injection: Input<string>;
                /**
                 * The KV stores to associate with the viewer request function.
                 *
                 * @example
                 * ```js
                 * {
                 *   routes: {
                 *     "/api/*": {
                 *       edge: {
                 *         viewerRequest: {
                 *           kvStores: ["arn:aws:cloudfront::123456789012:key-value-store/my-store"]
                 *         }
                 *       }
                 *     }
                 *   }
                 * }
                 * ```
                 */
                kvStores?: Input<Input<string>[]>;
              }>;
              /**
               * Configure the viewer response function.
               *
               * The viewer response function can be used to modify outgoing responses before they are sent to the client. For example, you can add security headers or change the response status code.
               *
               * By default, no viewer response function is set. A new function will be created with the provided code.
               *
               * @example
               * Add a custom header to all responses
               * ```js
               * {
               *   routes: {
               *     "/api/*": {
               *       edge: {
               *         viewerResponse: {
               *           injection: `event.response.headers["x-foo"] = "bar";`
               *         }
               *       }
               *     }
               *   }
               * }
               * ```
               */
              viewerResponse?: Input<{
                /**
                 * Code to inject into the viewer response function.
                 */
                injection: Input<string>;
                /**
                 * The KV stores to associate with the viewer response function.
                 *
                 * @example
                 * ```js
                 * {
                 *   routes: {
                 *     "/api/*": {
                 *       edge: {
                 *         viewerResponse: {
                 *           kvStores: ["arn:aws:cloudfront::123456789012:key-value-store/my-store"]
                 *         }
                 *       }
                 *     }
                 *   }
                 * }
                 * ```
                 */
                kvStores?: Input<Input<string>[]>;
              }>;
            };
          }
      >
    >
  >;
  /**
   * Configure how the CloudFront cache invalidations are handled.
   * :::tip
   * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
   * :::
   * @default Invalidation is turned off
   * @example
   * Enable invalidations. Setting this to `true` will invalidate all paths. It is equivalent
   * to passing in `{ paths: ["/*"] }`.
   *
   * ```js
   * {
   *   invalidation: true
   * }
   * ```
   */
  invalidation?: CdnArgs["invalidation"];
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cache Policy that's attached to each CloudFront behavior.
     */
    cachePolicy?: Transform<cloudfront.CachePolicyArgs>;
    /**
     * Transform the CloudFront CDN resource.
     */
    cdn?: Transform<CdnArgs>;
  };
}

/**
 * The `Router` component lets you use a CloudFront distribution to direct requests to various parts of your application.
 * The `routes` prop can route requests to function URLs, different domains, or any component that has an associated URL.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": "https://some-internal-service.com"
 *   }
 * });
 * ```
 *
 * #### Route to a function URL
 *
 * ```ts title="sst.config.ts"
 * const myFunction = new sst.aws.Function("MyFunction", {
 *   handler: "src/api.handler",
 *   url: true,
 * });
 *
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": myFunction.url
 *   }
 * });
 * ```
 *
 * #### Route all API requests separately
 *
 * ```ts {4} title="sst.config.ts"
 * new sst.aws.Router("MyRouter", {
 *   routes: {
 *     "/*": "https://myapp.com",
 *     "/api/*": myFunction.url
 *   }
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.Router("MyRouter", {
 *   domain: "myapp.com",
 *   routes: {
 *     "/*": myFunction.url
 *   }
 * });
 * ```
 */
export class Router extends Component implements Link.Linkable {
  private cdn: Cdn;
  private cachePolicy: cloudfront.CachePolicy;

  constructor(
    name: string,
    args: RouterArgs,
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    let defaultCfFunction: cloudfront.Function;
    const parent = this;

    const routes = normalizeRoutes();

    const cachePolicy = createCachePolicy();
    const cdn = createCdn();

    this.cachePolicy = cachePolicy;
    this.cdn = cdn;

    this.registerOutputs({
      _hint: this.url,
    });

    function normalizeRoutes() {
      return output(args.routes).apply((routes) => {
        return Object.fromEntries(
          Object.entries(routes).map(([path, route]) => {
            if (!path.startsWith("/")) {
              throw new Error(
                `In "${name}" Router, the route path "${path}" must start with a "/"`,
              );
            }

            return [path, typeof route === "string" ? { url: route } : route];
          }),
        );
      });
    }

    function createCloudFrontFunction(
      path: string,
      type: "request" | "response",
      config?: {
        injection: string;
        kvStores?: string[];
      },
    ) {
      console.log("createCloudFrontFunction", path, type, config);
      if (type === "request" && !config) {
        defaultCfFunction =
          defaultCfFunction ??
          new cloudfront.Function(
            `${name}CloudfrontFunction`,
            {
              runtime: "cloudfront-js-2.0",
              code: [
                `function handler(event) {`,
                `  event.request.headers["x-forwarded-host"] = event.request.headers.host;`,
                `  return event.request;`,
                `}`,
              ].join("\n"),
            },
            { parent },
          );
        return defaultCfFunction;
      }

      if (type === "request") {
        return new cloudfront.Function(
          `${name}CloudfrontFunction${hashStringToPrettyString(path, 8)}`,
          {
            runtime: "cloudfront-js-2.0",
            keyValueStoreAssociations: config!.kvStores ?? [],
            code: `
function handler(event) {
  event.request.headers["x-forwarded-host"] = event.request.headers.host;
  ${config!.injection ?? ""}
  return event.request;
}`,
          },
          { parent },
        );
      }
      // TODO
      // - test Router
      // - reply to StaticSite and Router ppl in #general

      return new cloudfront.Function(
        `${name}CloudfrontFunction${hashStringToPrettyString(path, 8)}`,
        {
          runtime: "cloudfront-js-2.0",
          keyValueStoreAssociations: config!.kvStores ?? [],
          code: `
function handler(event) {
  ${config!.injection ?? ""}
  return event.response;
}`,
        },
        { parent },
      );
    }

    function createCachePolicy() {
      return new cloudfront.CachePolicy(
        ...transform(
          args.transform?.cachePolicy,
          `${name}CachePolicy`,
          {
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
          },
          { parent },
        ),
      );
    }

    function createCdn() {
      const origins = buildOrigins();
      const behaviors = buildBehaviors();

      return new Cdn(
        ...transform(
          args.transform?.cdn,
          `${name}Cdn`,
          {
            comment: `${name} router`,
            origins,
            defaultCacheBehavior: behaviors.apply(
              (behaviors) => behaviors.find((b) => !b.pathPattern)!,
            ),
            orderedCacheBehaviors: behaviors.apply(
              (behaviors) =>
                behaviors.filter(
                  (b) => b.pathPattern,
                ) as types.input.cloudfront.DistributionOrderedCacheBehavior[],
            ),
            domain: args.domain,
            invalidation: args.invalidation,
            wait: true,
          },
          { parent },
        ),
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

      return output(routes).apply((routes) => {
        const origins = Object.entries(routes).map(([path, route]) => ({
          originId: path,
          domainName: new URL(route.url).host,
          ...defaultConfig,
        }));

        if (!routes["/*"]) {
          origins.push({
            originId: "/*",
            domainName: "do-not-exist.sst.dev",
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
        cachePolicyId: cachePolicy.id,
        // CloudFront's Managed-AllViewerExceptHostHeader policy
        originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
      };

      return output(routes).apply((routes) => {
        const behaviors = Object.entries(routes).map(([path, route]) => ({
          ...(path === "/*" ? {} : { pathPattern: path }),
          targetOriginId: path,
          functionAssociations: [
            {
              eventType: "viewer-request",
              functionArn: createCloudFrontFunction(
                path,
                "request",
                route.edge?.viewerRequest,
              ).arn,
            },
            ...(route.edge?.viewerResponse
              ? [
                  {
                    eventType: "viewer-response",
                    functionArn: createCloudFrontFunction(
                      path,
                      "response",
                      route.edge.viewerResponse,
                    ).arn,
                  },
                ]
              : []),
          ],
          ...defaultConfig,
        }));

        if (!routes["/*"]) {
          behaviors.push({
            targetOriginId: "/*",
            functionAssociations: [],
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

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon CloudFront CDN resource.
       */
      cdn: this.cdn,
    };
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

const __pulumiType = "sst:aws:Router";
// @ts-expect-error
Router.__pulumiType = __pulumiType;
