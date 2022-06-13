import { DynamoDB } from "aws-sdk";
import Note from "./Note";

const dynamoDb = new DynamoDB.DocumentClient();

export default async function getNoteById(
  noteId: string
): Promise<Note | undefined> {
  const params = {
    Key: { id: noteId },
    TableName: process.env.NOTES_TABLE as string,
  };

  const { Item } = await dynamoDb.get(params).promise();

  return Item as Note;
}
