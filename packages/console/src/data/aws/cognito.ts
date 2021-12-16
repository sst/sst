import CognitoIdentityServiceProvider from "aws-sdk/clients/cognitoidentityserviceprovider";
import { useInfiniteQuery } from "react-query";
import { useService } from "./service";

export function useUsersQuery(pool: string) {
  const cognito = useService(CognitoIdentityServiceProvider);
  return useInfiniteQuery({
    queryKey: ["users", pool],
    queryFn: async () => {
      console.log("Running");
      const response = await cognito
        .listUsers({
          UserPoolId: pool,
        })
        .promise();
      return response;
    },
  });
}
