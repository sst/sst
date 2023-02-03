import { schema } from "./schema";
import { GraphQLHandler } from "sst/node/graphql";

export const handler = GraphQLHandler({
  schema,
});
