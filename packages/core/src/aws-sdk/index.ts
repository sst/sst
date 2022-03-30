import { AwsCliCompatible } from "./awscli-compatible";
import aws from "aws-sdk";

let credentials: aws.Credentials;

export interface AwsCredentialsOptions {
  /**
   * The AWS Credentials profile to force.
   */
  readonly profile: string;
}

export async function getAwsCredentials(options?: AwsCredentialsOptions) {
  if (!credentials) {
    const chain = await AwsCliCompatible.credentialChain({
      profile: options?.profile,
      //ec2instance: options.ec2creds,
      //containerCreds: options.containerCreds,
      //httpOptions: sdkOptions.httpOptions,
    });
    credentials = await chain.resolvePromise();
  }
  return credentials;
}
