import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import { z } from "zod";
import { Duration, toCdkDuration } from "./duration";

export const CorsPropsSchema = z.object({
  /**
   * Allow including credentials in HTTP requests
   */
  allowCredentials: z.boolean().optional(),
  /**
   * Specify which headers are allowed
   */
  allowHeaders: z.string().array().optional(),
  /**
   * Specify which methods are allowed
   */
  allowMethods: z.string().array().optional(),
  /**
   * Specify which origins are allowed
   */
  allowOrigins: z.string().array().optional(),
  /**
   * Specify which HTTP headers are returned
   */
  exposeHeaders: z.string().array().optional(),
  /**
   * Specify how long the results of a preflight request can be cached
   */
  maxAge: z.string().optional(),
});
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
   */
  allowMethods?: (keyof typeof apig.CorsHttpMethod)[];
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
   * The duration that the browser should cache preflight request results.
   */
  maxAge?: Duration;
}

export function buildCorsConfig(
  cors?: boolean | CorsProps
): apig.CorsPreflightOptions | undefined {
  // Handle cors: false
  if (cors === false) {
    return;
  }

  // Handle cors: true | undefined
  else if (cors === undefined || cors === true) {
    return {
      allowHeaders: ["*"],
      allowMethods: [apig.CorsHttpMethod.ANY],
      allowOrigins: ["*"],
    };
  }

  // Handle cors: apig.CorsPreflightOptions
  else {
    return {
      allowCredentials: cors.allowCredentials,
      allowHeaders: cors.allowHeaders,
      allowMethods: cors.allowMethods as apig.CorsHttpMethod[],
      allowOrigins: cors.allowOrigins,
      exposeHeaders: cors.exposeHeaders,
      maxAge: cors.maxAge && toCdkDuration(cors.maxAge),
    };
    cors as apig.CorsPreflightOptions;
  }
}
