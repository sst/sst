async function up(db) {
  await db.schema
    .createTable("tbl20220123")
    .addColumn("id", "text", (col) => col.primaryKey())
    .execute();
}

async function down(db) {
  await db.schema.dropTable("tbl20220123").execute();
}

module.exports = { up, down };
