import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import { useInfiniteQuery, useMutation, useQueryClient } from "react-query";
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
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (opts: {
      pool: string;
      email: string;
      phone?: string;
      password?: string;
    }) => {
      if (!opts.email) {
        throw new Error("Email is required");
      }
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: opts.pool,
          Username: opts.email,
          TemporaryPassword: "password",
          UserAttributes: opts.phone
            ? [
                {
                  Name: "phone_number",
                  Value: opts.phone,
                },
              ]
            : [],
        })
      );
      if (opts.password)
        await cognito.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: opts.pool,
            Username: opts.email,
            Password: "password",
            Permanent: true,
          })
        );
    },
    onSuccess: () => {
      client.invalidateQueries(["users"]);
    },
  });
}

export function useDeleteUser() {
  const cognito = useClient(CognitoIdentityProviderClient);
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (opts: { pool: string; id: string }) => {
      const response = await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: opts.pool,
          Username: opts.id,
        })
      );
      return response;
    },
    onSuccess: () => {
      client.invalidateQueries(["users"]);
    },
  });
}

export function useUser(pool: string, id: string) {
  const client = useQueryClient();
  const data = client.getQueryData<{ pages: [ListUsersCommandOutput] }>([
    "users",
    pool,
  ]);
  return data?.pages
    ?.flatMap((value) => value.Users || [])
    .find((user) => user.Username === id);
}
