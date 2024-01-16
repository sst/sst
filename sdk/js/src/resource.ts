export interface Resource {
  [key: string]: any;
}

const $SST_LINKS: Resource = {};

export const Resource = new Proxy(
  {},
  {
    get(target, prop: string) {
      if (process.env[prop]) {
        return process.env[prop];
      }
      if (prop in $SST_LINKS) {
        return $SST_LINKS[prop];
      }
      throw new Error(`"${prop}" is not linked`);
    },
  }
) as Resource;
