import { AwsClient } from "aws4fetch";
import { Prettify } from "../util/prettify.js";

export const client = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION,
});

export type AwsOptions = Exclude<
  Parameters<AwsClient["fetch"]>[1],
  null | undefined
>["aws"];
