import { FunctionPermissionArgs } from "./function.js";

export function permission(input: FunctionPermissionArgs) {
  return {
    type: "aws.permission" as const,
    ...input,
  };
}

export type Permission = ReturnType<typeof permission>;
