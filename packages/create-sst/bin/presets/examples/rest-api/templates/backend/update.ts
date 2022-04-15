import notes from "./notes";

export async function main(event) {
  const note = notes[event.pathParameters.id];

  if (!note) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: true }),
    };
  }

  const data = JSON.parse(event.body);

  note.content = data.content;

  return {
    statusCode: 200,
    body: JSON.stringify(note),
  };
}
