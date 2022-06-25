import { schema } from "./schema";
import { createGQLHandler } from "@serverless-stack/node/graphql";

export const handler = createGQLHandler({
  schema
});
