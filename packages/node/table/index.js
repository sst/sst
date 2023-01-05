import { createProxy, parseEnvironment } from "../util/index.js";
export const Table = createProxy("Table");
Object.assign(Table, parseEnvironment("Table", ["tableName"]));
