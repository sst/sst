import { createProxy, getVariables } from "../util/index.js";

export interface RDSResources {}

export const RDS = createProxy<RDSResources>("RDS");
Object.assign(RDS, await getVariables("RDS"));
