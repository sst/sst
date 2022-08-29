import { Context } from "@serverless-stack/node/context/index.js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Client } from "@aws-sdk/smithy-client";
import { RegionInputConfig } from "@aws-sdk/config-resolver";
import { RetryInputConfig } from "@aws-sdk/middleware-retry";
import { AwsAuthInputConfig } from "@aws-sdk/middleware-signing";
import { useConfig } from "../config/index.js";

type Config = RegionInputConfig & RetryInputConfig & AwsAuthInputConfig;

export const useAWSCredentialsProvider = Context.memo(async () => {
  const config = await useConfig();
  const provider = defaultProvider({
    profile: config.profile,
  });
  return provider;
});

export const useAWSCredentials = async () => {
  const provider = await useAWSCredentialsProvider();
  return provider();
};

const useClientCache = Context.memo(() => new Map<string, any>());

export async function useAWSClient<C extends Client<any, any, any, any>>(
  client: new (config: Config) => C,
  force = false
) {
  const cache = useClientCache();
  const existing = cache.get(client.name);
  if (existing && !force) return existing as C;
  const [config, credentials] = await Promise.all([
    useConfig(),
    useAWSCredentialsProvider(),
  ]);
  const result = new client({
    region: config.region,
    credentials: credentials,
  });
  cache.set(client.name, result);
  return result;
}
