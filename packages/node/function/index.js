import { createProxy, parseEnvironment } from "../util/index.js";
export const Function = createProxy("Function");
Object.assign(Function, parseEnvironment("Function", ["functionName"]));
