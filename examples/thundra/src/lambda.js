import Thundra from "@thundra/core";

const thundra = Thundra({
  apiKey: process.env.THUNDRA_API_KEY,
});

// wrap your lambda function with Thundra
export const handler = thundra(async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received`,
  };
});
