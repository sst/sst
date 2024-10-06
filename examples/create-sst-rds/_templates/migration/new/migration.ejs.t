---
to: packages/core/migrations/<%= Date.now() %>_<%= name.replace(/\s/g, "_") %>.mjs
---
import { Kysely } from "kysely";

/**
 * @typedef {import("../src/sql.generated").Database} Database
 */

/**
 * @param db {Kysely<Database>}
 */
export async function up(db) {
}

/**
 * @param db {Kysely<Database>}
 */
export async function down(db) {
}
