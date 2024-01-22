import { Input, Output, output } from "@pulumi/pulumi";
import fs from "node:fs";
import { FunctionPermissionArgs } from "./function.js";
import { VisibleError } from "./error.js";
import { Component } from "./component.js";

export interface Link {
  value: Input<any>;
  type: string;
}

export interface Linkable {
  urn: Output<string>;
  getSSTLink(): Link;
}

export function isLinkable(obj: any): obj is Linkable {
  return "getSSTLink" in obj;
}

export interface AWSLinkable {
  getSSTAWSPermissions(): FunctionPermissionArgs;
}

export function isAWSLinkable(obj: any): obj is AWSLinkable {
  return "getSSTAWSPermissions" in obj;
}

export function buildLinkableData(links: Link[]) {
  return links.map((l) => {
    if (isLinkable(l)) {
      const link = l.getSSTLink();
      return {
        name: l.urn.apply((x) => x.split("::").at(-1)!),
        value: link.value,
        type: link.type,
      };
    }
    throw new VisibleError(`${l} is not a linkable component`);
  });
}

///////////////////////////////////
// Functions for type generation //
///////////////////////////////////

const DEFAULT_TYPE_PATH = ".sst/types.generated.ts";
interface TypeRegistration {
  path?: string;
  name: string;
  type: any;
}
const files = new Map<string, Record<string, string>>();
export async function initializeLinkRegistry() {
  files.clear();
}

export async function registerLinkType(reg: TypeRegistration) {
  const path = reg.path ?? DEFAULT_TYPE_PATH;
  let file = files.get(path);
  if (!file) {
    file = {};
    files.set(path, file);
  }
  file[reg.name] = reg.type;
  await fs.promises.writeFile(
    path,
    [
      `declare module "sst" {`,
      `  export interface Resource {`,
      ...Object.entries(file).map(([key, value]) => `    ${key}: ${value};`),
      `    [key: string]: any`,
      `  }`,
      `}`,
      `export {}`,
    ].join("\n")
  );
}

//////////////////////////////////////////////////////
// Functions for making non SST components linkable //
//////////////////////////////////////////////////////

export function makeLinkable<T>(
  obj: { new (...args: any[]): T },
  cb: (this: T) => Link
) {
  obj.prototype.getSSTLink = cb;
}

export function makeAWSLinkable<T>(
  obj: { new (...args: any[]): T },
  cb: (this: T) => FunctionPermissionArgs
) {
  obj.prototype.getSSTAWSPermissions = cb;
}
