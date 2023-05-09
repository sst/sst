import { z } from "zod";
import { zod } from "../util/zod";

export { Account } from "./account";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

export * as AWS from ".";

const sts = new STSClient({});

export const assumeRole = zod(z.string(), async (id) => {
  console.log("assuming role for account", id);
  const result = await sts.send(
    new AssumeRoleCommand({
      RoleArn: `arn:aws:iam::${id}:role/sst`,
      RoleSessionName: "sst",
      DurationSeconds: 900,
    })
  );
  return {
    secretAccessKey: result.Credentials!.SecretAccessKey!,
    accessKeyId: result.Credentials!.AccessKeyId!,
    sessionToken: result.Credentials!.SessionToken!,
  };
});
