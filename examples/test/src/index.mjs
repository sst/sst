export async function handler() {
  console.log("hello");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: "ok",
  };
}
