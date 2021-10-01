import { MainStack as ApiStack } from "./api-stack";
import { MainStack as NextjsStack } from "./nextjs-site-stack";

export default async function main(app) {
  const apiStack = new ApiStack(app, "api");
  new NextjsStack(app, "nextjs", { api: apiStack.api });
}
