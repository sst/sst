import { useMemo } from "react";
import { useAuth } from "../global";
import { Service } from "aws-sdk";
import { ServiceConfigurationOptions } from "aws-sdk/lib/service";

export function useService<S extends Service>(
  svc: new (config: ServiceConfigurationOptions) => S
) {
  const auth = useAuth();
  return useMemo(
    () =>
      new svc({
        ...auth.data!,
        maxRetries: 0,
      }) as S,
    [auth.data]
  );
}
