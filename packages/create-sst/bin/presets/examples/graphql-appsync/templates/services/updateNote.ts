import { DynamoDB } from "aws-sdk";
import { Table } from "sst/node/table";
import Note from "./Note";

const dynamoDb = new DynamoDB.DocumentClient();

export default async function updateNote(note: Note): Promise<Note> {
  const params = {
    Key: { id: note.id },
    ReturnValues: "UPDATED_NEW",
    UpdateExpression: "SET content = :content",
    TableName: Table.Notes.tableName,
    ExpressionAttributeValues: { ":content": note.content },
  };

  await dynamoDb.update(params).promise();

  return note as Note;
}
