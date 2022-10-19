import { createProxy, parseEnvironment } from "../util";
export const RDS = createProxy("RDS");
Object.assign(RDS, parseEnvironment("RDS", ["clusterArn", "secretArn", "defaultDatabaseName"]));
