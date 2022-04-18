import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import notes from "./notes";

export async function main(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const note =
    event.pathParameters && event.pathParameters.id
      ? notes[event.pathParameters.id]
      : null;

  if (!note) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: true }),
    };
  }

  if (event.body) {
    const data = JSON.parse(event.body);
    note.content = data.content || note.content;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(note),
  };
}
