import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { Example } from "@aws-monorepo/core/example";

export const handler: Handler = async (event) => {
  console.log(
    "this is a long time as a test for the long and to see if it wraps and here cool wow",
  );
  return {
    statusCode: 200,
    body: `${Example.hello()} Linked to ${Resource.Database.name}.`,
  };
};
