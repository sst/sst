import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});
import { parseEnvironment, buildSsmPath, ssmNameToPropName } from "../util/index.js";
import { Handler } from "../context/handler.js";
import { useDomainName, usePath } from "../api/index.js";
const className = "Auth";
const authData = parseEnvironment(className, ["publicKey", "privateKey", "prefix"]);
let prefix;
let publicKey;
let privateKey;
// Each function can only be attached to one Auth construct, so we can
// assume there is only one entry in authData.
const authNames = Object.keys(authData);
if (authNames.length !== 0) {
    const authName = authNames[0];
    await replaceWithSsmValues(authName);
    // @ts-ignore
    prefix = authData[authName].prefix;
    // @ts-ignore
    publicKey = authData[authName].publicKey;
    // @ts-ignore
    privateKey = authData[authName].privateKey;
}
async function replaceWithSsmValues(name) {
    // Fetch all secrets
    const props = ["privateKey", "publicKey"]
        .filter((prop) => authData[name][prop] === "__FETCH_FROM_SSM__");
    if (props.length === 0) {
        return;
    }
    const results = await loadSsm(name, props);
    if (results.invalidParams.length > 0) {
        const missingProps = results.invalidParams.map(ssmNameToPropName);
        throw new Error(`The following Auth parameters were not found: ${missingProps.join(", ")}`);
    }
    // Store all secrets in a map
    for (const item of results.validParams) {
        const prop = ssmNameToPropName(item.Name);
        // @ts-ignore
        authData[name][prop] = item.Value;
    }
}
async function loadSsm(name, props) {
    const SSM_PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/${className}/${name}`;
    // Fetch secrets
    const validParams = [];
    const invalidParams = [];
    const command = new GetParametersCommand({
        Names: props.map((prop) => buildSsmPath(className, name, prop)),
        WithDecryption: true,
    });
    const result = await ssm.send(command);
    return {
        validParams: result.Parameters || [],
        invalidParams: result.InvalidParameters || [],
    };
}
export function getPublicKey() {
    if (!publicKey) {
        throw new Error(`Cannot use ${className}.publicKey. Please make sure it is bound to this function.`);
    }
    return publicKey;
}
export function getPrivateKey() {
    if (!privateKey) {
        throw new Error(`Cannot use ${className}.privateKey. Please make sure it is bound to this function.`);
    }
    return privateKey;
}
export function getPrefix() {
    if (!prefix) {
        throw new Error(`Cannot use ${className}.prefix. Please make sure it is bound to this function.`);
    }
    return prefix;
}
/**
 * Create a new auth handler that can be used to create an authenticated session.
 *
 * @example
 * ```ts
 * export const handler = AuthHandler({
 *   providers: {
 *     google: {
 *       adapter: GoogleAdapter,
 *       clientId: "...",
 *       onSuccess: (claims) => {
 *       }
 *     }
 *   }
 * })
 * ```
 */
export function AuthHandler(config) {
    return Handler("api", async () => {
        const path = usePath();
        const prefix = getPrefix().split("/")
            .filter(Boolean)
            .join("/");
        if (path.join("/") === prefix) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(Object.fromEntries(Object.keys(config.providers).map((x) => [
                    x,
                    `https://${useDomainName()}/${prefix}/${x}/authorize`,
                ])), null, 4),
            };
        }
        const [providerName] = path.slice(-2);
        const provider = config.providers[providerName];
        if (!provider)
            throw new Error("No matching provider found");
        return provider();
    });
}
