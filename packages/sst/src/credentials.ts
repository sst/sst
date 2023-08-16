import { Context } from "./context/context.js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Client } from "@aws-sdk/smithy-client";
import { RegionInputConfig } from "@aws-sdk/config-resolver";
import { RetryInputConfig } from "@aws-sdk/middleware-retry";
import { AwsAuthInputConfig } from "@aws-sdk/middleware-signing";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { Logger } from "./logger.js";
import { SdkProvider } from "sst-aws-cdk/lib/api/aws-auth/sdk-provider.js";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";

type Config = RegionInputConfig &
  RetryInputConfig &
  AwsAuthInputConfig &
  HostHeaderConditionConfig;

export const useAWSCredentialsProvider = Context.memo(() => {
  const project = useProject();
  Logger.debug("Using AWS profile", project.config.profile);
  const provider = fromNodeProviderChain({
    clientConfig: { region: project.config.region },
    profile: project.config.profile,
    roleArn: project.config.role,
    mfaCodeProvider: async (serialArn: string) => {
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise<string>((resolve) => {
        Logger.debug(`Require MFA token for serial ARN ${serialArn}`);
        const prompt = () =>
          rl.question(`Enter MFA code for ${serialArn}: `, async (input) => {
            if (input.trim() !== "") {
              resolve(input.trim());
              rl.close();
            } else {
              // prompt again if no input
              prompt();
            }
          });
        prompt();
      });
    },
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
  const printNoInternet = (() => {
    let lastPrinted = 0;
    return () => {
      const now = Date.now();
      if (now - lastPrinted > 5000) {
        console.log("Waiting for internet connection...");
        lastPrinted = now;
      }
    };
  })();
  const result = new client({
    region: project.config.region,
    credentials: credentials,
    retryStrategy: new StandardRetryStrategy(async () => 10000, {
      retryDecider: (e: any) => {
        // Handle no internet connection => retry
        if (e.code === "ENOTFOUND") {
          printNoInternet();
          return true;
        }

        // Handle throttling errors => retry
        if (
          [
            "ThrottlingException",
            "Throttling",
            "TooManyRequestsException",
            "OperationAbortedException",
            "TimeoutError",
            "NetworkingError",
          ].includes(e.name)
        ) {
          Logger.debug("Retry AWS call", e.name, e.message);
          return true;
        }

        return false;
      },
      delayDecider: (_, attempts) => {
        return Math.min(1.5 ** attempts * 100, 5000);
      },
      // AWS SDK v3 has an idea of "retry tokens" which are used to
      // prevent multiple retries from happening at the same time.
      // This is a workaround to disable that.
      retryQuota: {
        hasRetryTokens: () => true,
        releaseRetryTokens: () => {},
        retrieveRetryTokens: () => 1,
      },
    }),
  });
  cache.set(client.name, result);
  Logger.debug("Created AWS client", client.name);
  return result;
}

// @ts-expect-error
import stupid from "aws-sdk/lib/maintenance_mode_message.js";
stupid.suppress = true;
import aws from "aws-sdk";
import { useProject } from "./project.js";
import { HostHeaderConditionConfig } from "aws-sdk/clients/elbv2.js";
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
  const provider = new SdkProvider(chain, project.config.region!, {
    maxRetries: 10000,
    region: project.config.region,
  });

  return provider;
});
