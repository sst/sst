import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});
import { createProxy, parseEnvironment } from "../util";
export const StaticSite = createProxy("StaticSite");
export const ReactStaticSite = createProxy("ReactStaticSite");
export const ViteStaticSite = createProxy("ViteStaticSite");
export const RemixSite = createProxy("RemixSite");
export const NextjsSite = createProxy("NextjsSite");
const staticSiteData = parseEnvironment("StaticSite", ["url"]);
const reactSiteData = parseEnvironment("ReactStaticSite", ["url"]);
const viteSiteData = parseEnvironment("ViteStaticSite", ["url"]);
const nextjsSiteData = parseEnvironment("NextjsSite", ["url"]);
const remixSiteData = parseEnvironment("RemixSite", ["url"]);
console.log(reactSiteData);
await replaceWithSsmValues("StaticSite", staticSiteData);
await replaceWithSsmValues("ReactStaticSite", reactSiteData);
await replaceWithSsmValues("ViteStaticSite", viteSiteData);
await replaceWithSsmValues("NextjsSite", nextjsSiteData);
await replaceWithSsmValues("RemixSite", remixSiteData);
console.log(reactSiteData);
Object.assign(StaticSite, staticSiteData);
Object.assign(ReactStaticSite, reactSiteData);
Object.assign(ViteStaticSite, viteSiteData);
Object.assign(NextjsSite, nextjsSiteData);
Object.assign(RemixSite, remixSiteData);
async function replaceWithSsmValues(className, siteData) {
    const SSM_PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/${className}/`;
    // Find all the site data that match the prefix
    const names = Object.keys(siteData);
    if (names.length === 0) {
        return;
    }
    // Fetch all secrets
    const results = await loadSsm(SSM_PREFIX, names);
    if (results.invalidParams.length > 0) {
        const missingNames = results.invalidParams.map(ssmNameToConstructId);
        throw new Error(`The following ${className} were not found: ${missingNames.join(", ")}`);
    }
    // Store all secrets in a map
    for (const item of results.validParams) {
        const name = ssmNameToConstructId(item.Name);
        // @ts-ignore
        siteData[name] = { url: item.Value };
    }
}
async function loadSsm(prefix, names) {
    // Split names into chunks of 10
    const chunks = [];
    for (let i = 0; i < names.length; i += 10) {
        chunks.push(names.slice(i, i + 10));
    }
    // Fetch secrets
    const validParams = [];
    const invalidParams = [];
    await Promise.all(chunks.map(async (chunk) => {
        const command = new GetParametersCommand({
            Names: chunk.map((name) => `${prefix}${name}/url`),
            WithDecryption: true,
        });
        const result = await ssm.send(command);
        validParams.push(...(result.Parameters || []));
        invalidParams.push(...(result.InvalidParameters || []));
    }));
    return { validParams, invalidParams };
}
function ssmNameToConstructId(ssmName) {
    const parts = ssmName.split("/");
    return parts[parts.length - 2];
}
