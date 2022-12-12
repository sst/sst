import "@aws-sdk/types";
import { Context } from "./context/context.js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Client } from "@aws-sdk/smithy-client";
import { RegionInputConfig } from "@aws-sdk/config-resolver";
import { RetryInputConfig } from "@aws-sdk/middleware-retry";
import { AwsAuthInputConfig } from "@aws-sdk/middleware-signing";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { Logger } from "./logger.js";
import { SdkProvider } from "aws-cdk/lib/api/aws-auth/sdk-provider.js";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";

type Config = RegionInputConfig & RetryInputConfig & AwsAuthInputConfig;

export const useAWSCredentialsProvider = Context.memo(() => {
  const project = useProject();
  Logger.debug("Using AWS profile", project.profile);
  const provider = fromNodeProviderChain({
    profile: project.profile,
  });
  return provider;
});

export const useAWSCredentials = () => {
  const provider = useAWSCredentialsProvider();
  return provider();
};

export const useSTSIdentity = Context.memo(async () => {
  const sts = useAWSClient(STSClient);
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  Logger.debug(
    "Using identity",
    "Account:",
    identity.Account,
    "User:",
    identity.UserId
  );
  return identity;
});

const useClientCache = Context.memo(() => new Map<string, any>());

export function useAWSClient<C extends Client<any, any, any, any>>(
  client: new (config: Config) => C,
  force = false
) {
  const cache = useClientCache();
  const existing = cache.get(client.name);
  if (existing && !force) return existing as C;
  const [project, credentials] = [useProject(), useAWSCredentialsProvider()];
  const result = new client({
    region: project.region,
    credentials: credentials,
    retryStrategy: new StandardRetryStrategy(async () => 10000, {
      retryDecider: (err) => {
        if (err.$fault === "client") return false;
        if (err.message === "Could not load credentials from any providers")
          return false;

        return true;
      },
      delayDecider: (_, attempts) => {
        return Math.min(1.5 ** attempts * 100, 5000);
      },
    }),
  });
  cache.set(client.name, result);
  Logger.debug("Created AWS client", client.name);
  return result;
}

import aws from "aws-sdk";
import { useProject } from "./app.js";
const CredentialProviderChain = aws.CredentialProviderChain;

/**
 * Do not use this. It is only used for AWS CDK compatibility.
 */
export const useAWSProvider = Context.memo(async () => {
  Logger.debug("Loading v2 AWS SDK");
  const project = useProject();
  const creds = await useAWSCredentials();
  const chain = new CredentialProviderChain([
    () => ({
      ...creds,
      get(cb) {
        cb();
      },
      async getPromise() {},
      needsRefresh() {
        return false;
      },
      refresh(cb) {
        cb();
      },
      async refreshPromise() {},
      expired: false,
      expireTime: creds.expiration!,
      accessKeyId: creds.accessKeyId!,
      sessionToken: creds.sessionToken!,
      secretAccessKey: creds.secretAccessKey!,
    }),
  ]);
  const provider = new SdkProvider(chain, project.region!, {
    maxRetries: 10000,
    region: project.region,
  });

  return provider;
});
