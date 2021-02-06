export async function main() {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "This is a public route." }),
  };
}
