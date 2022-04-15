import notes from "./notes";

export async function main(event) {
  const note = notes[event.pathParameters.id];
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
