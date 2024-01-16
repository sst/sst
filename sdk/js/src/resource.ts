export interface Resource {
  [key: string]: any;
}

export const Resource = new Proxy(
  {},
  {
    get(target, prop: string) {
      // Read from environment first
      const envName = `SST_RESOURCE_${prop}`;
      if (process.env[envName]) {
        return JSON.parse(process.env[envName]!);
      }
      if (prop in globalThis.$SST_LINKS) {
        return globalThis.$SST_LINKS[prop];
      }
      throw new Error(`"${prop}" is not linked`);
    },
  }
) as Resource;
