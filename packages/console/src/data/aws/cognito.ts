import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { useInfiniteQuery } from "react-query";
import { useClient } from "./client";

export function useUsersQuery(pool: string) {
  const cognito = useClient(CognitoIdentityProviderClient);
  return useInfiniteQuery({
    queryKey: ["users", pool],
    queryFn: async () => {
      const response = await cognito.send(
        new ListUsersCommand({
          UserPoolId: pool,
        })
      );
      return response;
    },
  });
}
