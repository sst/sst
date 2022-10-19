import { createProxy, parseEnvironment } from "../util";

export interface FunctionResources { }

export const Function = createProxy<FunctionResources>("Function");
Object.assign(Function, parseEnvironment("Function", ["functionName"]));