import { output, runtime } from "@pulumi/pulumi";
import { lazy } from "../../../util/lazy";
import { Provider, Region, getDefaultTags } from "@pulumi/aws";

const useProviderCache = lazy(() => new Map<string, Provider>());

export const useProvider = (region: Region) => {
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
  const provider = new Provider(`AwsProvider.sst.${region}`, {
    ...config,
    region,
    defaultTags: {
      tags: output(getDefaultTags()).apply((result) => result.tags),
    },
  });
  cache.set(region, provider);
  return provider;
};
