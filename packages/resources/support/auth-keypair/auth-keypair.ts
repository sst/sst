import { SSMClient } from "@aws-sdk/client-ssm";
import crypto from "crypto";
import { promisify } from "util";
import fs from "fs/promises";

const generateKeyPair = promisify(crypto.generateKeyPair);

interface Event {
  params: {};
}

export async function onCreate(evt: Event) {
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
}
