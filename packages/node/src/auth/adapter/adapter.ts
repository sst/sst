import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function createAdapter<A extends (config: any) => Adapter>(adapter: A) {
  return adapter;
}

export type Adapter = () => Promise<APIGatewayProxyStructuredResultV2>;
