import { OidcBasicConfig } from "./oidc.js";
export declare const TwitchAdapter: (config: OidcBasicConfig) => () => Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2>;
