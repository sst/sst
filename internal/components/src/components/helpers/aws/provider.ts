import { output } from "@pulumi/pulumi";
import { lazy } from "../../../util/lazy";

const useProviderCache = lazy(() => new Map<string, aws.Provider>());

export const useProvider = (region: aws.Region) => {
  const cache = useProviderCache();
  const existing = cache.get(region);
  if (existing) return existing;

  const provider = new aws.Provider(`AwsProvider.sst.${region}`, {
    region,
    defaultTags: {
      tags: output(aws.getDefaultTags()).apply((result) => result.tags),
    },
  });
  cache.set(region, provider);
  return provider;
};
