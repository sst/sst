import { ApiHandler } from "sst/node/api";

export const handler = ApiHandler(async (evt) => {
  console.log(evt);
  return {
    statusCode: 200,
    body: "Hello, World!",
  };
});
