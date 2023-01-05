export function createProxy(constructName) {
    return new Proxy({}, {
        get(target, prop) {
            if (typeof prop === "string") {
                // normalize prop to convert kebab cases like `my-table` to `my_table`
                const normProp = normalizeId(prop);
                if (!(normProp in target)) {
                    throw new Error(`Cannot use ${constructName}.${String(prop)}. Please make sure it is bound to this function.`);
                }
                return Reflect.get(target, normProp);
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
function buildEnvPrefix(constructName, prop) {
    return `SST_${constructName}_${prop}_`;
}
export function buildSsmPath(constructName, id, prop) {
    return `${ssmPrefix()}/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/${constructName}/${id}/${prop}`;
}
export function buildSsmFallbackPath(constructName, id, prop) {
    return `${ssmPrefix()}/sst/${process.env.SST_APP}/.fallback/${constructName}/${id}/${prop}`;
}
export function ssmNameToConstructId(ssmName) {
    const prefix = ssmPrefix();
    return ssmName.substring(prefix.length).split("/")[5];
}
export function ssmNameToPropName(ssmName) {
    const prefix = ssmPrefix();
    return ssmName.substring(prefix.length).split("/").pop();
}
function normalizeId(name) {
    return name.replace(/-/g, "_");
}
function ssmPrefix() {
    return process.env.SST_SSM_PREFIX || "";
}
