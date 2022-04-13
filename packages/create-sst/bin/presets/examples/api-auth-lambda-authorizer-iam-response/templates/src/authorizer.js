export const main = async (event) => {
  // Get authorization header
  const authHeader = event.headers.authorization;

  // Parse for username and password
  let username, password;
  if (authHeader) {
    const base64Info = authHeader.split(" ")[1];
    // Stored as 'username:password' in base64
    const userInfo = Buffer.from(base64Info, "base64").toString();
    [username, password] = userInfo.split(":");
  }

  return {
    principalId: username,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect:
            username === "admin" && password === "password" ? "Allow" : "Deny",
          Resource: "*",
        },
      ],
    },
    context: {
      username,
    },
  };
};
