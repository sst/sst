export const main = async (event, context, callback) => {
  const authHeader = event.headers.Authorization;
  let username, password;

  if (authHeader) {
    const base64Info = authHeader.split(" ")[1];
    // Stored as 'username:password' in base64
    const userInfo = new Buffer(base64Info, "base64").toString();
    [username, password] = userInfo.split(":");
  }

  return username === "hello" && password === "world"
    ? callback(null, {
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
      })
    : callback("Unauthorized");
};
