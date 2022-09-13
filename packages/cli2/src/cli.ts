import { Context } from "@serverless-stack/node/context/index.js";

interface GlobalCLIOptionsContext {
  profile?: string;
  stage?: string;
}
export const GlobalCLIOptionsContext =
  Context.create<GlobalCLIOptionsContext>();
