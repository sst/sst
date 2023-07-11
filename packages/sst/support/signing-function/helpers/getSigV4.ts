import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

export const getSigV4 = (region: string) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  if (!accessKeyId) throw new Error("AWS_ACCESS_KEY_ID missing");
  if (!secretAccessKey) throw new Error("AWS_SECRET_ACCESS_KEY missing");
  if (!sessionToken) throw new Error("AWS_SESSION_TOKEN missing");
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
