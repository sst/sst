import handler from "./util/handler";
import dynamoDb from "./util/dynamodb";

export const main = handler(async (event) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    // 'Key' defines the partition key and sort key of the item to be removed
    Key: {
      userId: event.requestContext.authorizer.iam.cognitoIdentity.identityId,
      noteId: event.pathParameters.id, // The id of the note from the path
    },
  };

  await dynamoDb.delete(params);

  return { status: true };
});
