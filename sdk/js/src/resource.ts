export interface Resource {
  [key: string]: any;
}

const $SST_LINKS: Resource = {};

export const Resource = new Proxy(
  {},
  {
    get(target, prop: string) {
      // Read from environment first
      const envName = `SST_RESOURCE_${prop}`;
      if (process.env[envName]) {
        return JSON.parse(process.env[envName]!);
      }
      if (prop in $SST_LINKS) {
        return $SST_LINKS[prop];
      }
      throw new Error(`"${prop}" is not linked`);
    },
  }
) as Resource;
