import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import crypto from "crypto";
import { promisify } from "util";

const generateKeyPair = promisify(crypto.generateKeyPair);
export async function AuthKeys(cfnRequest: any) {
  const { privatePath, publicPath } = cfnRequest.ResourceProperties;

  const { publicKey, privateKey } = await generateKeyPair("rsa", {
    modulusLength: 2048, // the length of your key in bits
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
  const client = new SSMClient({});

  await client.send(
    new PutParameterCommand({
      Name: privatePath,
      Value: privateKey,
      Type: "SecureString",
    })
  );

  await client.send(
    new PutParameterCommand({
      Name: publicPath,
      Value: publicKey,
      Type: "SecureString",
    })
  );
}
