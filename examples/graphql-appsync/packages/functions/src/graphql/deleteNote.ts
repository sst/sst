import { DynamoDB } from "aws-sdk";
import { Table } from "sst/node/table";

const dynamoDb = new DynamoDB.DocumentClient();

export default async function deleteNote(noteId: string): Promise<string> {
  const params = {
    Key: { id: noteId },
    TableName: Table.Notes.tableName,
  };

  await dynamoDb.delete(params).promise();

  return noteId;
}
