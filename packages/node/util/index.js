export function createProxy(constructName) {
    return new Proxy({}, {
        get(target, prop) {
            if (!(prop in target)) {
                throw new Error(`Cannot use ${constructName}.${String(prop)}. Please make sure it is bound to this function.`);
            }
            return Reflect.get(target, prop);
        }
    });
}
export function parseEnvironment(constructName, props) {
    const acc = {};
    Object.keys(process.env)
        .filter((env) => env.startsWith(buildEnvPrefix(constructName, props[0])))
        .forEach((env) => {
        props.forEach((prop) => {
            const name = env.replace(new RegExp(`^${buildEnvPrefix(constructName, prop)}`), "");
            // @ts-ignore
            acc[name] = acc[name] || {};
            // @ts-ignore
            acc[name][prop] = process.env[env];
        });
    });
    return acc;
}
function buildEnvPrefix(constructName, prop) {
    return prop === "."
        ? `SST_${constructName}_`
        : `SST_${constructName}_${prop}_`;
}
