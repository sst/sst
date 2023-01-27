import { createProxy, parseEnvironment } from "../util/index.js";

export interface FunctionResources {}

export const Function = createProxy<FunctionResources>("Function");
Object.assign(Function, parseEnvironment("Function", ["functionName"]));
