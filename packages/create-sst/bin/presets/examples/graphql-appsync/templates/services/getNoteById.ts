import { DynamoDB } from "aws-sdk";
import { Table } from "@serverless-stack/node/table";
import Note from "./Note";

const dynamoDb = new DynamoDB.DocumentClient();

export default async function getNoteById(
  noteId: string
): Promise<Note | undefined> {
  const params = {
    Key: { id: noteId },
    TableName: Table.Notes.tableName,
  };

  const { Item } = await dynamoDb.get(params).promise();

  return Item as Note;
}
