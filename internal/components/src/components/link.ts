import { Input, Output, output } from "@pulumi/pulumi";
import fs from "node:fs";

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
  getSSTAWSPermissions(): string[];
}

export function isAWSLinkable(obj: any): obj is AWSLinkable {
  return "getSSTAWSPermissions" in obj;
}

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
    ].join("\n"),
  );
}

export function makeLinkable<T>(
  obj: { new (...args: any[]): T },
  cb: (this: T) => Link,
) {
  obj.prototype.getSSTLink = cb;
}
