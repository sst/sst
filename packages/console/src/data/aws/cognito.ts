import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommandOutput,
  DescribeUserPoolCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import { useClient } from "./client";

export function useUsersQuery(pool: string) {
  const cognito = useClient(CognitoIdentityProviderClient);
  return useInfiniteQuery<ListUsersCommandOutput>({
    queryKey: ["users", pool],
    queryFn: async (q) => {
      const response = await cognito.send(
        new ListUsersCommand({
          UserPoolId: pool,
          PaginationToken: q.pageParam,
        })
      );
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.PaginationToken,
  });
}

export function useCreateUser() {
  const cognito = useClient(CognitoIdentityProviderClient);
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (opts: {
      pool: string;
      email: string;
      password: string;
      phone?: string;
    }) => {
      if (!opts.email) throw new Error("Email is required");
      if (!opts.password) throw new Error("Password is required");
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: opts.pool,
          Username: opts.email,
          TemporaryPassword: opts.password,
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
            Password: opts.password,
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

export function useUserPool(pool?: string) {
  const cognito = useClient(CognitoIdentityProviderClient);
  return useQuery({
    enabled: pool !== undefined,
    queryKey: ["userPool", pool],
    queryFn: async () => {
      const response = await cognito.send(
        new DescribeUserPoolCommand({
          UserPoolId: pool,
        })
      );
      return response;
    },
  });
}
