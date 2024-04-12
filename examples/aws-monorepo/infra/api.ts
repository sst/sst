import { database } from "./database";

export const api = new sst.aws.Function("Api", {
  link: [database],
  url: true,
  handler: "./packages/functions/src/api.handler",
});
