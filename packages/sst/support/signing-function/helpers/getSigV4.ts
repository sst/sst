import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

export const getSigV4 = (region: string) => {
  if (process.env.AWS_ACCESS_KEY_ID === undefined)
    throw new Error("AWS_ACCESS_KEY_ID missing");
  if (process.env.AWS_SECRET_ACCESS_KEY === undefined)
    throw new Error("AWS_SECRET_ACCESS_KEY missing");

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  return new SignatureV4({
    service: "lambda",
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    },
    sha256: Sha256,
    applyChecksum: false,
  });
};
