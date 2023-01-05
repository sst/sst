import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { BaseClient, Issuer, TokenSet } from "openid-client";
export interface OauthBasicConfig {
    /**
     * The clientID provided by the third party oauth service
     */
    clientID: string;
    /**
     * The clientSecret provided by the third party oauth service
     */
    clientSecret: string;
    /**
     * Various scopes requested for the access token
     */
    scope: string;
    prompt?: string;
    /**
     * onSuccess callback when the oauth flow is successful. Will provide tokenset
     */
    onSuccess: (tokenset: TokenSet, client: BaseClient) => Promise<APIGatewayProxyStructuredResultV2>;
}
export interface OauthConfig extends OauthBasicConfig {
    issuer: Issuer;
}
export declare const OauthAdapter: (config: OauthConfig) => () => Promise<APIGatewayProxyStructuredResultV2>;
