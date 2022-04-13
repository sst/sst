import { APIGatewayProxyResult } from "aws-lambda";
import notes from "./notes";

export async function main(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, "  "),
  };
}
