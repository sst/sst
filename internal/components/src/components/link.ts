import { Output } from "@pulumi/pulumi";
import fs from "node:fs";

export interface Link {
  value: Output<any>;
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

interface TypeRegistration {
  path: string;
  name: string;
  type: any;
}
const files = new Map<string, Record<string, string>>();
export function initializeLinkRegistry() {
  files.clear();
}

export async function registerLinkType(reg: TypeRegistration) {
  let file = files.get(reg.path);
  if (!file) {
    file = {};
    files.set(reg.path, file);
  }
  file[reg.name] = reg.type;
  await fs.promises.writeFile(
    reg.path,
    [
      `declare global {`,
      `  export const Resource: {`,
      ...Object.entries(file).map(([key, value]) => `    ${key}: ${value};`),
      `    [key: string]: any`,
      `  }`,
      `}`,
      `export {}`,
    ].join("\n"),
  );
}
