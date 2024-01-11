declare global {
  const SST_LINKS: { name: string; value: any }[];
}

const resources = Object.fromEntries(
  SST_LINKS.map((item) => [item.name, item.value])
);

export const Resource = new Proxy(resources, {
  get(target, prop: string) {
    if (!(prop in target)) {
      throw new Error(`"${prop}" is not linked`);
    }
    return target[prop];
  },
});
