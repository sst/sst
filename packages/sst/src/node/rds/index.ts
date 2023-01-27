import { createProxy, parseEnvironment } from "../util/index.js";

export interface RDSResources {}

export const RDS = createProxy<RDSResources>("RDS");
Object.assign(
  RDS,
  parseEnvironment("RDS", ["clusterArn", "secretArn", "defaultDatabaseName"])
);
