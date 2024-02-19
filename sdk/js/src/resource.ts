import { env } from "node:process";

export interface Resource {
  [key: string]: any;
}

const raw: Record<string, any> = {
  // @ts-expect-error,
  ...globalThis.$SST_LINKS,
};
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("SST_RESOURCE_") && value) {
    raw[key.slice("SST_RESOURCE_".length)] = JSON.parse(value);
  }
}

export const Resource = new Proxy(raw, {
  get(target, prop: string) {
    if (prop in target) {
      return target[prop];
    }
    throw new Error(`"${prop}" is not linked`);
  },
}) as Resource;
