import { FunctionPermissionArgs } from "./function";

export const URL_UNAVAILABLE = "URL_UNAVAILABLE_IN_DEV_MODE";

export interface AWSLinkable {
  getSSTAWSPermissions(): FunctionPermissionArgs[];
}

export function isLinkable(obj: any): obj is AWSLinkable {
  return "getSSTAWSPermissions" in obj;
}

export function linkable<T>(
  obj: { new (...args: any[]): T },
  cb: (resource: T) => FunctionPermissionArgs[],
) {
  obj.prototype.getSSTAWSPermissions = function () {
    return cb(this);
  };
}
