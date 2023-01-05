import { GetParametersCommand, SSMClient, Parameter } from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});
import { createProxy, parseEnvironment, buildSsmPath, ssmNameToConstructId } from "../util/index.js";

export interface StaticSiteResources { }
export interface ReactStaticSiteResources { }
export interface ViteStaticSiteResources { }
export interface NextjsSiteResources { }
export interface RemixSiteResources { }

export const StaticSite = createProxy<StaticSiteResources>("StaticSite");
export const ReactStaticSite = createProxy<ReactStaticSiteResources>("ReactStaticSite");
export const ViteStaticSite = createProxy<ViteStaticSiteResources>("ViteStaticSite");
export const RemixSite = createProxy<RemixSiteResources>("RemixSite");
export const NextjsSite = createProxy<NextjsSiteResources>("NextjsSite");
const staticSiteData = parseEnvironment("StaticSite", ["url"]);
const reactSiteData = parseEnvironment("ReactStaticSite", ["url"]);
const viteSiteData = parseEnvironment("ViteStaticSite", ["url"]);
const nextjsSiteData = parseEnvironment("NextjsSite", ["url"]);
const remixSiteData = parseEnvironment("RemixSite", ["url"]);
await replaceWithSsmValues("StaticSite", staticSiteData);
await replaceWithSsmValues("ReactStaticSite", reactSiteData);
await replaceWithSsmValues("ViteStaticSite", viteSiteData);
await replaceWithSsmValues("NextjsSite", nextjsSiteData);
await replaceWithSsmValues("RemixSite", remixSiteData);

Object.assign(StaticSite, staticSiteData);
Object.assign(ReactStaticSite, reactSiteData);
Object.assign(ViteStaticSite, viteSiteData);
Object.assign(NextjsSite, nextjsSiteData);
Object.assign(RemixSite, remixSiteData);

async function replaceWithSsmValues(className: string, siteData: Record<string, any>) {
  // Find all the site data that match the prefix
  const names = Object
    .keys(siteData)
    .filter((name) => siteData[name].url === "__FETCH_FROM_SSM__");
  if (names.length === 0) {
    return;
  }

  // Fetch all secrets
  const results = await loadSsm(className, names);
  if (results.invalidParams.length > 0) {
    const missingNames = results.invalidParams.map(ssmNameToConstructId);
    throw new Error(
      `The following ${className} were not found: ${missingNames.join(", ")}`
    );
  }

  // Store all secrets in a map
  for (const item of results.validParams) {
    const name = ssmNameToConstructId(item.Name!);
    // @ts-ignore
    siteData[name] = { url: item.Value! };
  }
}

async function loadSsm(className: string, names: string[]) {
  // Split names into chunks of 10
  const chunks = [];
  for (let i = 0; i < names.length; i += 10) {
    chunks.push(names.slice(i, i + 10));
  }

  // Fetch secrets
  const validParams: Parameter[] = [];
  const invalidParams: string[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const command = new GetParametersCommand({
        Names: chunk.map((name) => buildSsmPath(className, name, "url")),
        WithDecryption: true,
      });
      const result = await ssm.send(command);
      validParams.push(...(result.Parameters || []));
      invalidParams.push(...(result.InvalidParameters || []));
    })
  );
  return { validParams, invalidParams };
}