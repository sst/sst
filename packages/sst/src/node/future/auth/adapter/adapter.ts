import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

export type Adapter<T = any> = (evt: APIGatewayProxyEventV2) => Promise<
  | { type: "step"; properties: APIGatewayProxyStructuredResultV2 }
  | {
      type: "success";
      properties: T;
    }
  | {
      type: "error";
    }
>;
