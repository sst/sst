import { createProxy, parseEnvironment } from "../util/index.js";
export const RDS = createProxy("RDS");
Object.assign(RDS, parseEnvironment("RDS", ["clusterArn", "secretArn", "defaultDatabaseName"]));
