import { db } from "./drizzle";
import { todo } from "./todo.sql";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";

export const handler: APIGatewayProxyHandlerV2 = async (evt) => {
  if (evt.requestContext.http.method === "GET") {
    const result = await db.select().from(todo).execute();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  }

  if (evt.requestContext.http.method === "POST") {
    const result = await db
      .insert(todo)
      .values({ title: "new todo " + randomUUID() })
      .returning()
      .execute();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  }

  return {
    statusCode: 404,
    body: "not found",
  };
};
