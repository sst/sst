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
  const acc = {};
  Object.keys(process.env)
    .filter((env) => env.startsWith(`SST_${constructName}_${props[0]}`))
    .forEach((env) => {
      // @ts-ignore
      acc[name] = {};
      props.forEach((prop) => {
        const name = env.replace(new RegExp(`^SST_${constructName}_${prop}_`), "");
        // @ts-ignore
        acc[name][prop] = process.env[env];
      });
    });
  return acc;
}