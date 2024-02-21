export async function handler() {
  console.log("hello");
  throw new Error("test");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: "ok",
  };
}
