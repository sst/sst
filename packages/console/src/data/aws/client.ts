import { useMemo } from "react";
import { useAuth } from "../global";
import { Client } from "@aws-sdk/smithy-client";
import { RegionInputConfig } from "@aws-sdk/config-resolver";
import { RetryInputConfig } from "@aws-sdk/middleware-retry";
import { AwsAuthInputConfig } from "@aws-sdk/middleware-signing";

type Config = RegionInputConfig & RetryInputConfig & AwsAuthInputConfig;

export function useClient<C extends Client<any, any, any, any>>(
  svc: new (config: Config) => C
) {
  const auth = useAuth();
  return useMemo(
    () =>
      new svc({
        ...auth.data!,
        maxAttempts: 3,
      }) as C,
    [auth.data]
  );
}
