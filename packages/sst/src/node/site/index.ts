import { createProxy, getVariables } from "../util/index.js";

export interface StaticSiteResources {}
export interface ReactStaticSiteResources {}
export interface ViteStaticSiteResources {}
export interface NextjsSiteResources {}
export interface RemixSiteResources {}

export const StaticSite = createProxy<StaticSiteResources>("StaticSite");
export const ReactStaticSite =
  createProxy<ReactStaticSiteResources>("ReactStaticSite");
export const ViteStaticSite =
  createProxy<ViteStaticSiteResources>("ViteStaticSite");
export const RemixSite = createProxy<RemixSiteResources>("RemixSite");
export const NextjsSite = createProxy<NextjsSiteResources>("NextjsSite");
const staticSiteData = await getVariables("StaticSite");
const reactSiteData = await getVariables("ReactStaticSite");
const viteSiteData = await getVariables("ViteStaticSite");
const nextjsSiteData = await getVariables("NextjsSite");
const remixSiteData = await getVariables("RemixSite");
Object.assign(StaticSite, staticSiteData);
Object.assign(ReactStaticSite, reactSiteData);
Object.assign(ViteStaticSite, viteSiteData);
Object.assign(NextjsSite, nextjsSiteData);
Object.assign(RemixSite, remixSiteData);
