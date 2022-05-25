import notes from "../notes";

export async function main() {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, "  "),
  };
}
