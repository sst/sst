import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";
export type {} from "@smithy/types";

export function lazy<T>(callback: () => T) {
  let loaded = false;
  let result: T;

  return () => {
    if (!loaded) {
      result = callback();
      loaded = true;
    }
    return result;
  };
}

const useClientCache = lazy(() => new Map<string, any>());

export function useAWSClient<C extends any>(
  client: new (config: any) => C,
  region?: string
) {
  const cache = useClientCache();
  const existing = cache.get(client.name);
  if (existing) return existing as C;

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
    region,
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
  return result;
}
