export async function handler() {
  console.log("this is a log line");
  throw new Error("test");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: "ok",
  };
}
