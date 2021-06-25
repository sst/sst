export async function main() {
  const body = [];
  for (let i = 0; i < 1000; i++) {
    body.push("1234567890");
  }

  return {
    statusCode: 200,
    body: body.join(""),
  };
}
