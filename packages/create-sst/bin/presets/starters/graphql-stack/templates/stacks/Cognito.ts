import { StackContext, Auth } from "@serverless-stack/resources";

export function Cognito({ stack }: StackContext) {
  const auth = new Auth(stack, "auth");
  return auth;
}
