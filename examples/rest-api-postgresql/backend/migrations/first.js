module.exports.up = async (db) => {
  await db.schema
    .createTable("todos")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("title", "text")
    .execute();
};

module.exports.down = async (db) => {
  await db.schema.dropTable("todos").execute();
};
