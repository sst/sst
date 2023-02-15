export function createProxy<T extends object>(constructName: string) {
  return new Proxy<T>({} as any, {
    get(target, prop) {
      if (typeof prop === "string") {
        // normalize prop to convert kebab cases like `my-table` to `my_table`
        const normProp = normalizeId(prop);
        if (!(normProp in target)) {
          throw new Error(
            `Cannot use ${constructName}.${String(
              prop
            )}. Please make sure it is bound to this function.`
          );
        }
        return Reflect.get(target, normProp);
      }
      return Reflect.get(target, prop);
    },
  });
}

export function parseEnvironment(constructName: string, props: string[]) {
  const acc: Record<string, Record<string, string>> = {};
  Object.keys(process.env)
    .filter((env) => env.startsWith(buildEnvPrefix(constructName, props[0])))
    .forEach((env) => {
      const name = env.replace(
        new RegExp(`^${buildEnvPrefix(constructName, props[0])}`),
        ""
      );
      // @ts-ignore
      acc[name] = {};
      props.forEach((prop) => {
        // @ts-ignore
        acc[name][prop] =
          process.env[`${buildEnvPrefix(constructName, prop)}${name}`];
      });
    });
  return acc;
}

function buildEnvPrefix(constructName: string, prop: string) {
  return `SST_${constructName}_${prop}_`;
}

export function buildSsmPath(constructName: string, id: string, prop: string) {
  return `${ssmPrefix()}${constructName}/${id}/${prop}`;
}

export function buildSsmFallbackPath(
  constructName: string,
  id: string,
  prop: string
) {
  return `/sst/${process.env.SST_APP}/.fallback/${constructName}/${id}/${prop}`;
}

export function ssmNameToConstructId(ssmName: string) {
  const prefix = ssmPrefix();
  return ssmName.substring(prefix.length).split("/")[1];
}

export function ssmFallbackNameToConstructId(ssmName: string) {
  return ssmName.split("/")[5];
}

export function ssmNameToPropName(ssmName: string) {
  const prefix = ssmPrefix();
  return ssmName.substring(prefix.length).split("/").pop();
}

function normalizeId(name: string) {
  return name.replace(/-/g, "_");
}

function ssmPrefix() {
  return process.env.SST_SSM_PREFIX || "";
}
