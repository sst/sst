import { createProxy, parseEnvironment } from "../util";

export interface TableResources { }

export const Table = createProxy<TableResources>("Table");
Object.assign(Table, parseEnvironment("Table", ["tableName"]));