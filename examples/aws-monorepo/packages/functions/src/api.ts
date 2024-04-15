import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { Example } from "@aws-monorepo/core/example";

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    body: `${Example.hello()} Linked to ${Resource.Database.name}.`,
  };
};
