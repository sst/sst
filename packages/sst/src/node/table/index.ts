import { createProxy, getVariables } from "../util/index.js";

export interface TableResources {}

export const Table = createProxy<TableResources>("Table");
Object.assign(Table, await getVariables("Table"));
