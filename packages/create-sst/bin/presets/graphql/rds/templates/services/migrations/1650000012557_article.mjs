import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("article")
    .addColumn("articleID", "text", col => col.primaryKey())
    .addColumn("title", "text", col => col.notNull())
    .addColumn("url", "text", col => col.notNull())
    .addColumn("created", "timestamp", col =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("idx_article_created")
    .on("article")
    .column("created")
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropIndex("idx_article_created").execute();
  await db.schema.dropTable("article").execute();
}
