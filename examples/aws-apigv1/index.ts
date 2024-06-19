export async function handler() {
  return {
    statusCode: 200,
    body: "hello world",
  };
}

export async function authorizer(event, context) {
  const authHeader = event.authorizationToken;
  let username, password;

  if (authHeader) {
    const base64Info = authHeader.split(" ")[1];
    // Stored as 'username:password' in base64
    const userInfo = Buffer.from(base64Info, "base64").toString();
    [username, password] = userInfo.split(":");
  }

  return username === "hello" && password === "world"
    ? {
        principalId: "*",
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Allow",
              Resource: "*",
            },
          ],
        },
      }
    : "Unauthorized";
}
