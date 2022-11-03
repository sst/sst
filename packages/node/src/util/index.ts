export function createProxy<T extends object>(constructName: string) {
  return new Proxy<T>({} as any, {
    get(target, prop) {
      if (!(prop in target)) {
        throw new Error(`Cannot use ${constructName}.${String(prop)}. Please make sure it is bound to this function.`);
      }
      return Reflect.get(target, prop);
    }
  });
}

export function parseEnvironment(constructName: string, props: string[]) {
  const acc: Record<string, Record<string, string>> = {};
  Object.keys(process.env)
    .filter((env) => env.startsWith(buildEnvPrefix(constructName, props[0])))
    .forEach((env) => {
      const name = env.replace(new RegExp(`^${buildEnvPrefix(constructName, props[0])}`), "");
      // @ts-ignore
      acc[name] = {};
      props.forEach((prop) => {
        // @ts-ignore
        acc[name][prop] = process.env[`${buildEnvPrefix(constructName, prop)}${name}`];
      });
    });
  return acc;
}

function buildEnvPrefix(constructName: string, prop: string) {
  return `SST_${constructName}_${prop}_`;
}

export function buildSsmPath(constructName: string, id: string, prop: string) {
  return `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/${constructName}/${id}/${prop}`;
}

export function buildSsmFallbackPath(constructName: string, id: string, prop: string) {
  return `/sst/${process.env.SST_APP}/.fallback/${constructName}/${id}/${prop}`;
}