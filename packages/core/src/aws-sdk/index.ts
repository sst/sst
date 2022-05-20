import { AwsCliCompatible } from "./awscli-compatible.js";
import aws from "aws-sdk";

let credentials: aws.Credentials;

export interface AwsCredentialsOptions {
  /**
   * The AWS Credentials profile to force.
   */
  readonly profile: string;
}

export async function configureAwsCredentials(options?: AwsCredentialsOptions) {
  // Get credentials
  if (!credentials) {
    const chain = await AwsCliCompatible.credentialChain({
      profile: options?.profile,
      //ec2instance: options.ec2creds,
      //containerCreds: options.containerCreds,
      //httpOptions: sdkOptions.httpOptions,
    });
    credentials = await chain.resolvePromise();
  }

  // Configure AWS SDK
  // Note that this is required when SST make AWS SDK calls directly
  aws.config.credentials = credentials;

  // Configure environment variable
  // Note that this is required when SST invokes CDK CLI
  process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
  if (credentials.sessionToken) {
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
  }
}
