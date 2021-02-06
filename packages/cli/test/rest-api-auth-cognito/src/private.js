export async function main(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `This is a private route. The authenticated user's identity id is ${event.requestContext.authorizer.iam.cognitoIdentity.identityId}`,
    }),
  };
}
