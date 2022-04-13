import { DynamoDB } from "aws-sdk";
import Note from "./Note";

const dynamoDb = new DynamoDB.DocumentClient();

export default async function updateNote(note: Note): Promise<Note> {
  const params = {
    Key: { id: note.id },
    ReturnValues: "UPDATED_NEW",
    UpdateExpression: "SET content = :content",
    TableName: process.env.NOTES_TABLE as string,
    ExpressionAttributeValues: { ":content": note.content },
  };

  await dynamoDb.update(params).promise();

  return note as Note;
}
