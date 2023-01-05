import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { BaseClient, Issuer, TokenSet } from "openid-client";
export interface OidcBasicConfig {
    /**
     * The clientID provided by the third party oauth service
     */
    clientID: string;
    /**
     * onSuccess callback when the oauth flow is successful. Will provide tokenset
     */
    onSuccess: (claims: TokenSet, client: BaseClient) => Promise<APIGatewayProxyStructuredResultV2>;
}
export interface OidcConfig extends OidcBasicConfig {
    issuer: Issuer;
    scope: string;
}
export declare const OidcAdapter: (config: OidcConfig) => () => Promise<APIGatewayProxyStructuredResultV2>;
