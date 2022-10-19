import { createProxy, parseEnvironment } from "../util";
export const Table = createProxy("Table");
Object.assign(Table, parseEnvironment("Table", ["name"]));
