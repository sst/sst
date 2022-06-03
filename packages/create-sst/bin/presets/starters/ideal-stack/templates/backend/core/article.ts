import { SQL } from "@my-sst-app/core/sql";
import { ulid } from "ulid";

export * as Article from "./article";

export async function addComment(articleID: string, text: string) {
  return await SQL.DB.insertInto("comment")
    .values({
      commentID: ulid(),
      articleID,
      text,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function comments(articleID: string) {
  return await SQL.DB.selectFrom("comment")
    .selectAll()
    .where("articleID", "=", articleID)
    .execute();
}

export async function create(title: string, url: string) {
  const [result] = await SQL.DB.insertInto("article")
    .values({ articleID: ulid(), url, title })
    .returningAll()
    .execute();
  return result;
}

export async function list() {
  return await SQL.DB.selectFrom("article")
    .selectAll()
    .orderBy("created", "desc")
    .execute();
}

