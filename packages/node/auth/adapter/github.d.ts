import { OauthBasicConfig } from "./oauth.js";
export declare const GithubAdapter: (config: OauthBasicConfig) => () => Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2>;
