import { createProxy, parseEnvironment } from "../util";
export const Function = createProxy("Function");
Object.assign(Function, parseEnvironment("Function", ["functionName"]));
