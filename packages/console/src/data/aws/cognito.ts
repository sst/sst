import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { useInfiniteQuery, useMutation } from "react-query";
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

export function useCreateUser() {
  const cognito = useClient(CognitoIdentityProviderClient);

  return useMutation({
    mutationFn: async (opts: { pool: string; email: string }) => {
      const response = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: opts.pool,
          Username: opts.email,
        })
      );
      console.log(response);
      return response;
    },
  });
}
