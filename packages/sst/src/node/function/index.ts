import { createProxy, getVariables } from "../util/index.js";

export interface FunctionResources {}

export const Function = createProxy<FunctionResources>("Function");
Object.assign(Function, await getVariables("Function"));
