import { env } from "node:process";

export interface Resource {
  App: {
    name: string;
    stage: string;
  };
}

const raw: Record<string, any> = {
  // @ts-expect-error,
  ...globalThis.$SST_LINKS,
};
for (const [key, value] of Object.entries(env)) {
  if (key.startsWith("SST_RESOURCE_") && value) {
    raw[key.slice("SST_RESOURCE_".length)] = JSON.parse(value);
  }
}

export function fromCloudflareEnv(input: any) {
  for (let [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {}
    }
    raw[key] = value;
  }
}

export function wrapCloudflareHandler(handler: any) {
  if (typeof handler === "function" && handler.hasOwnProperty("prototype")) {
    return class extends handler {
      constructor(ctx: any, env: any) {
        fromCloudflareEnv(env);
        super(ctx, env);
      }
    };
  }

  function wrap(fn: any) {
    return function (req: any, env: any, ...rest: any[]) {
      fromCloudflareEnv(env);
      return fn(req, env, ...rest);
    };
  }

  const result = {} as any;
  for (const [key, value] of Object.entries(handler)) {
    result[key] = wrap(value);
  }
  return result;
}

export const Resource = new Proxy(raw, {
  get(_target, prop: string) {
    if (prop in raw) {
      return raw[prop];
    }
    throw new Error(`"${prop}" is not linked`);
  },
}) as Resource;
