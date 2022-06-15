import { HttpMethod, FunctionUrlCorsOptions } from "aws-cdk-lib/aws-lambda";
import { Duration, toCdkDuration } from "./duration.js";

export interface CorsProps {
  /**
   * Specifies whether credentials are included in the CORS request.
   */
  allowCredentials?: boolean;
  /**
   * The collection of allowed headers.
   */
  allowHeaders?: string[];
  /**
   * The collection of allowed HTTP methods.
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
   */
  exposeHeaders?: string[];
  /**
   * Specify how long the results of a preflight response can be cached
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
  else if (cors === undefined || cors === true) {
    return {
      allowedHeaders: ["*"],
      allowedMethods: [HttpMethod.ALL],
      allowedOrigins: ["*"],
    };
  }

  // Handle cors: FunctionUrlCorsOptions
  else {
    return {
      allowCredentials: cors.allowCredentials,
      allowedHeaders: cors.allowHeaders,
      allowedMethods: (cors.allowMethods || []).map(
        (method) =>
          method === "*"
            ? HttpMethod.ALL
            : HttpMethod[method as keyof typeof HttpMethod]
      ),
      allowedOrigins: cors.allowOrigins,
      exposedHeaders: cors.exposeHeaders,
      maxAge: cors.maxAge && toCdkDuration(cors.maxAge),
    };
  }
}
