import notes from "../../../services/notes";

export async function main() {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, "  "),
  };
}
