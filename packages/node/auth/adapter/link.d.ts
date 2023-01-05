import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
interface LinkConfig {
    onLink: (link: string, claims: Record<string, any>) => Promise<APIGatewayProxyStructuredResultV2>;
    onSuccess: (claims: Record<string, any>) => Promise<APIGatewayProxyStructuredResultV2>;
    onError: () => Promise<APIGatewayProxyStructuredResultV2>;
}
export declare const LinkAdapter: (config: LinkConfig) => () => Promise<APIGatewayProxyStructuredResultV2>;
export {};
