import { OauthBasicConfig } from "./oauth.js";
import { OidcBasicConfig } from "./oidc.js";
declare type GoogleConfig = (OauthBasicConfig & {
    mode: "oauth";
}) | (OidcBasicConfig & {
    mode: "oidc";
});
export declare const GoogleAdapter: (config: GoogleConfig) => () => Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2>;
export {};
