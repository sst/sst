import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
export declare function createAdapter<A extends (config: any) => Adapter>(adapter: A): A;
export declare type Adapter = () => Promise<APIGatewayProxyStructuredResultV2>;
