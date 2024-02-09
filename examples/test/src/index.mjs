export async function handler() {
  console.log("hello");
  console.log("bye");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: "Hello",
  };
}
