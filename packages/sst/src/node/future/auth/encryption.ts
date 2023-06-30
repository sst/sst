import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { Config } from "../../config/index.js";

export function encrypt(data: string) {
  // @ts-expect-error
  const key = Config[process.env.AUTH_ID + "PrivateKey"] as string;
  const hashed = createHash("sha256").update(key).digest();

  const iv = randomBytes(16); // Generate a random IV (Initialization Vector)
  const cipher = createCipheriv("aes-256-cbc", hashed, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return JSON.stringify({
    i: iv.toString("hex"),
    d: encrypted,
  });
}

export function decrypt(data: string) {
  // @ts-expect-error
  const key = Config[process.env.AUTH_ID + "PrivateKey"] as string;
  const hashed = createHash("sha256").update(key).digest();

  try {
    const parsed = JSON.parse(data);
    const decipher = createDecipheriv(
      "aes-256-cbc",
      hashed,
      Buffer.from(parsed.i, "hex")
    );
    let decrypted = decipher.update(parsed.d, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return;
  }
}
