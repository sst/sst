import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import notes from "./notes";

export async function main(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const note =
    event.pathParameters && event.pathParameters.id
      ? notes[event.pathParameters.id]
      : null;
  return note
    ? {
        statusCode: 200,
        body: JSON.stringify(note),
      }
    : {
        statusCode: 404,
        body: JSON.stringify({ error: true }),
      };
}
