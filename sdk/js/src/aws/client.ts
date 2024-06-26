import { AwsClient } from "aws4fetch";

interface EC2Credentials {
  AccessKeyId: string;
  SecretAccessKey: string;
  Token: string;
  Expiration: string;
  Type: string;
}

let cachedCredentials: EC2Credentials | null = null;

async function getCredentials(url: string): Promise<EC2Credentials> {
  if (cachedCredentials) {
    const currentTime = new Date();
    const fiveMinutesFromNow = new Date(currentTime.getTime() + 5 * 60000);
    const expirationTime = new Date(cachedCredentials.Expiration);
    if (expirationTime > fiveMinutesFromNow) {
      return cachedCredentials;
    }
  }

  const credentials = (await fetch(url).then((res) =>
    res.json(),
  )) as EC2Credentials;
  cachedCredentials = credentials;
  return credentials;
}

export async function client(): Promise<AwsClient> {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return new AwsClient({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      region: process.env.AWS_REGION,
    });
  }

  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
    const credentials = await getCredentials(
      "http://169.254.170.2" +
        process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
    );
    return new AwsClient({
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.Token,
      region: process.env.AWS_REGION,
    });
  }

  throw new Error("No AWS credentials found");
}

export type AwsOptions = Exclude<
  Parameters<AwsClient["fetch"]>[1],
  null | undefined
>["aws"];
