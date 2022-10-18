import {
  SSMClient,
  DeleteParameterCommand,
  GetParameterCommand,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import crypto from "crypto";
import { promisify } from "util";

const generateKeyPair = promisify(crypto.generateKeyPair);
export async function AuthKeys(cfnRequest: any) {
  const { privatePath, publicPath } = cfnRequest.ResourceProperties;
  const {
    privatePath: oldPrivatePath,
    publicPath: oldPublicPath,
  } = cfnRequest.OldResourceProperties;
  const client = new SSMClient({});

  switch (cfnRequest.RequestType) {
    case "Create":
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
      await Promise.all([
        client.send(
          new PutParameterCommand({
            Name: privatePath,
            Value: privateKey,
            Type: "SecureString",
          })
        ),

        client.send(
          new PutParameterCommand({
            Name: publicPath,
            Value: publicKey,
            Type: "SecureString",
          })
        ),
      ]);
      break;
    case "Update":
      const [oldPrivateKey, oldPublicKey] = await Promise.all([
        client.send(
          new GetParameterCommand({
            Name: privatePath,
            WithDecryption: true,
          })
        ),

        client.send(
          new GetParameterCommand({
            Name: publicPath,
            WithDecryption: true,
          })
        ),
      ]);
      await Promise.all([
        client.send(
          new PutParameterCommand({
            Name: privatePath,
            Value: oldPrivateKey.Parameter?.Value,
            Type: "SecureString",
          })
        ),

        client.send(
          new PutParameterCommand({
            Name: publicPath,
            Value: oldPublicKey.Parameter?.Value,
            Type: "SecureString",
          })
        ),
      ]);
      break;
    case "Delete":
      await Promise.all([
        client.send(
          new DeleteParameterCommand({
            Name: privatePath,
          })
        ),
        client.send(
          new DeleteParameterCommand({
            Name: publicPath,
          })
        ),
      ]);
      break;
    default:
      throw new Error("Unsupported request type");
  }
}
