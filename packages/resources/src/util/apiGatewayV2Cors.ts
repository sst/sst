import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import { Duration, toCdkDuration } from "./duration";

export interface CorsProps {
  /**
   * Allow including credentials in HTTP requests
   */
  allowCredentials?: boolean;
  /**
   * Specify which headers are allowed
   */
  allowHeaders?: string[];
  /**
   * Specify which methods are allowed
   */
  allowMethods?: (keyof typeof apig.CorsHttpMethod)[];
  /**
   * Specify which origins are allowed
   */
  allowOrigins?: string[];
  /**
   * Specify which HTTP headers are returned
   */
  exposeHeaders?: string[];
  /**
   * Specify how long the results of a preflight request can be cached
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
