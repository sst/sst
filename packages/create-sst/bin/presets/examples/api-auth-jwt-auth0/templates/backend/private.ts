export async function main(event) {
  console.log(event.requestContext.authorizer);
  return {
    statusCode: 200,
    body: `Hello ${event.requestContext.authorizer.jwt.claims.sub}!`,
  };
}
