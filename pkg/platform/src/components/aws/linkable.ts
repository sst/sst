import { FunctionPermissionArgs } from "./function";

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
