async function up(db) {
  await db.schema
    .createTable('person')
    .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
    .addColumn('first_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('last_name', 'varchar(255)')
    .addColumn('gender', 'varchar(50)', (col) => col.notNull())
    .execute()
}

async function down(db) {
  await db.schema.dropTable("person").execute();
}

module.exports = { up, down };
