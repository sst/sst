import { output, runtime } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { lazy } from "../../../util/lazy";

const useProviderCache = lazy(() => new Map<string, aws.Provider>());

export const useProvider = (region: aws.Region) => {
  const cache = useProviderCache();
  const existing = cache.get(region);
  if (existing) return existing;
  const config = runtime.allConfig();
  for (const key in config) {
    const value = config[key];
    delete config[key];
    const [prefix, real] = key.split(":");
    if (prefix !== "aws") continue;
    config[real] = value;
  }
  const provider = new aws.Provider(`AwsProvider.sst.${region}`, {
    ...config,
    region,
    defaultTags: {
      tags: output(aws.getDefaultTags()).apply((result) => result.tags),
    },
  });
  cache.set(region, provider);
  return provider;
};
