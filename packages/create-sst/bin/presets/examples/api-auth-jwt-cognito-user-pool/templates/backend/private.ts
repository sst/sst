export async function main(event) {
  return {
    statusCode: 200,
    body: `Hello ${event.requestContext.authorizer.jwt.claims.sub}!`,
  };
}
