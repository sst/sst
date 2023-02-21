import {
  Session,
  AuthHandler,
  FacebookAdapter,
} from "@serverless-stack/node/auth";
import { Table } from "@serverless-stack/node/table";
import { Config } from "@serverless-stack/node/config";
import { StaticSite } from "@serverless-stack/node/site";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    facebook: FacebookAdapter({
      clientID: Config.FACEBOOK_APP_ID,
      clientSecret: Config.FACEBOOK_APP_SECRET,
      scope: "openid email",
      onSuccess: async (tokenset) => {
        const claims = tokenset.claims();

        const ddb = new DynamoDBClient({});
        await ddb.send(
          new PutItemCommand({
            TableName: Table.users.tableName,
            Item: marshall({
              userId: claims.sub,
              email: claims.email,
              picture: claims.picture,
              name: claims.given_name,
            }),
          })
        );

        return Session.parameter({
          redirect: StaticSite.site.url || "http://127.0.0.1:5173",
          type: "user",
          properties: {
            userID: claims.sub,
          },
        });
      },
    }),
  },
});
