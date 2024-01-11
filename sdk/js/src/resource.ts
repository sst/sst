export interface Resource {
  [key: string]: any;
}

declare global {
  export const $SST_LINKS: Resource;
}
export const Resource = new Proxy($SST_LINKS, {
  get(target, prop: string) {
    if (!(prop in target)) {
      throw new Error(`"${prop}" is not linked`);
    }
    return target[prop];
  },
}) as Resource;
