export async function main() {
  const body = ["hi"];
  //  for (let i = 0; i < 100000; i++) {
  //    body.push("1234567890");
  //  }

  return {
    statusCode: 200,
    body: body.join(""),
  };
}
