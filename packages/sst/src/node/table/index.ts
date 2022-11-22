import { createProxy, parseEnvironment } from "../util/index.js";

export interface TableResources { }

export const Table = createProxy<TableResources>("Table");
Object.assign(Table, parseEnvironment("Table", ["tableName"]));