import { Session, AuthHandler, GoogleAdapter } from "@serverless-stack/node/auth";
import { Config } from "@serverless-stack/node/config";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const GOOGLE_CLIENT_ID =
  "1051197502784-vjtbj1rnckpagefmcoqnaon0cbglsdac.apps.googleusercontent.com";

declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    google: GoogleAdapter({
      mode: "oidc",
      clientID: GOOGLE_CLIENT_ID,
      onSuccess: async (tokenset) => {
        const claims = tokenset.claims();

        const ddb = new DynamoDBClient({});
        await ddb.send(new PutItemCommand({
          TableName: Config.TABLE_NAME,
          Item: marshall({
            userId: claims.sub,
            email: claims.email,
            picture: claims.picture,
            name: claims.given_name,
          }),
        }));

        return Session.parameter({
          redirect: process.env.IS_LOCAL ? "http://127.0.0.1:5173" : Config.SITE_URL,
          type: "user",
          properties: {
            userID: claims.sub,
          },
        });
      },
    }),
  },
});