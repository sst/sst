import { schema } from "./schema";
import { GraphQLHandler } from "@serverless-stack/node/graphql";

export const handler = GraphQLHandler({
  schema,
});
