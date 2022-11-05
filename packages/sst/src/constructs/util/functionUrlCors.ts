import { HttpMethod, FunctionUrlCorsOptions } from "aws-cdk-lib/aws-lambda";
import { Duration, toCdkDuration } from "./duration.js";

export interface CorsProps {
  /**
   * Specifies whether credentials are included in the CORS request.
   * @default false
   */
  allowCredentials?: boolean;
  /**
   * The collection of allowed headers.
   * @default Allow all headers.
   *
   * @example
   * ```js
   * // Allow all headers
   * allowHeaders: ["*"]
   *
   * // Allow specific headers
   * allowHeaders: ["Accept", "Content-Type", "Authorization"]
   * ```
   */
  allowHeaders?: string[];
  /**
   * The collection of allowed HTTP methods.
   * @default Allow all methods.
   *
   * @example
   * ```js
   * // Allow all methods
   * allowMethods: ["*"]
   *
   * // Allow specific methods
   * allowMethods: ["GET", "POST"]
   * ```
   */
  allowMethods?: (keyof Omit<typeof HttpMethod, "ALL"> | "*")[];
  /**
   * The collection of allowed origins.
   * @default Allow all origins.
   *
   * @example
   * ```js
   * // Allow all origins
   * allowOrigins: ["*"]
   *
   * // Allow specific origins. Note that the url protocol, ie. "https://", is required.
   * allowOrigins: ["https://domain.com"]
   * ```
   */
  allowOrigins?: string[];
  /**
   * The collection of exposed headers.
   * @default No expose headers are allowed.
   */
  exposeHeaders?: string[];
  /**
   * Specify how long the results of a preflight response can be cached
   * @default No caching
   *
   * @example
   * ```js
   * maxAge: "1 day"
   * ```
   */
  maxAge?: Duration;
}

export function buildCorsConfig(
  cors?: boolean | CorsProps
): FunctionUrlCorsOptions | undefined {
  // Handle cors: false
  if (cors === false) {
    return;
  }

  // Handle cors: true | undefined
  if (cors === undefined || cors === true) {
    cors = {} as CorsProps;
  }

  // Handle cors: CorsProps
  return {
    allowCredentials: cors.allowCredentials,
    allowedHeaders: cors.allowHeaders || ["*"],
    allowedMethods: (cors.allowMethods || ["*"]).map(
      (method) =>
        method === "*"
          ? HttpMethod.ALL
          : HttpMethod[method as keyof typeof HttpMethod]
    ),
    allowedOrigins: cors.allowOrigins || ["*"],
    exposedHeaders: cors.exposeHeaders,
    maxAge: cors.maxAge && toCdkDuration(cors.maxAge),
  };
}
