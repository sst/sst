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
  const client = new SSMClient({ logger: console });

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
      const {
        privatePath: oldPrivatePath,
        publicPath: oldPublicPath,
      } = cfnRequest.OldResourceProperties;
      if (oldPrivatePath !== privatePath) {
        try {
          const oldPrivateKey = await client.send(
            new GetParameterCommand({
              Name: oldPrivatePath,
              WithDecryption: true,
            })
          );
          await client.send(
            new PutParameterCommand({
              Name: privatePath,
              Value: oldPrivateKey.Parameter?.Value,
              Type: "SecureString",
              Overwrite: true,
            })
          );
        } catch (e: any) {
          if (e.name !== "ParameterNotFound") {
            throw e;
          }
        }
      }
      if (oldPublicPath !== publicPath) {
        try {
          const oldPublicKey = await client.send(
            new GetParameterCommand({
              Name: oldPublicPath,
              WithDecryption: true,
            })
          );
          await client.send(
            new PutParameterCommand({
              Name: publicPath,
              Value: oldPublicKey.Parameter?.Value,
              Type: "SecureString",
              Overwrite: true,
            })
          );
        } catch (e: any) {
          if (e.name !== "ParameterNotFound") {
            throw e;
          }
        }
      }
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
