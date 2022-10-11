import { Handler } from "@serverless-stack/node/context";
import { Config } from "@serverless-stack/node/config";
import { useSession } from "@serverless-stack/node/auth";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export const handler = Handler("api", async () => {
  const session = useSession();

  // Check user is authenticated
  if (session.type !== "user") {
    throw new Error("Not authenticated");
  }

  const ddb = new DynamoDBClient({});
  const data = await ddb.send(
    new GetItemCommand({
      TableName: Config.TABLE_NAME,
      Key: marshall({
        userId: session.properties.userID,
      })
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(unmarshall(data.Item!)),
  };
});