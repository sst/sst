export async function handler() {
  return {
    statusCode: 200,
    body: `Hello from ${process.env.AWS_REGION}`,
  };
}
