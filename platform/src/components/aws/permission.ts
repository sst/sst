/**
 * The AWS Permission Adapter is used to define AWS permissions associated with the
 * [Linkable resource](./linkable).
 *
 * @example
 *
 * ```ts
 * sst.aws.permission({
 *   actions: ["lambda:InvokeFunction"],
 *   resources: ["*"],
 * })
 * ```
 *
 * @packageDocumentation
 */

import { Prettify } from "../component.js";
import { FunctionPermissionArgs } from "./function.js";

export interface InputArgs extends Prettify<FunctionPermissionArgs> {}

export function permission(input: InputArgs) {
  return {
    type: "aws.permission" as const,
    ...input,
  };
}

export type Permission = ReturnType<typeof permission>;
