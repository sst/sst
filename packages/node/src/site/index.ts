import { createProxy, parseEnvironment } from "../util";

export interface StaticSiteResources { }
export interface ReactStaticSiteResources { }
export interface ViteStaticSiteResources { }
export interface RemixSiteResources { }
export interface NextjsSiteResources { }

export const StaticSite = createProxy<StaticSiteResources>("StaticSite");
export const ReactStaticSite = createProxy<ReactStaticSiteResources>("ReactStaticSite");
export const ViteStaticSite = createProxy<ViteStaticSiteResources>("ViteStaticSite");
export const RemixSite = createProxy<RemixSiteResources>("RemixSite");
export const NextjsSite = createProxy<NextjsSiteResources>("NextjsSite");
Object.assign(StaticSite, parseEnvironment("StaticSite", ["url"]));
Object.assign(ReactStaticSite, parseEnvironment("ReactStaticSite", ["url"]));
Object.assign(ViteStaticSite, parseEnvironment("ViteStaticSite", ["url"]));
Object.assign(RemixSite, parseEnvironment("RemixSite", ["url"]));
Object.assign(NextjsSite, parseEnvironment("NextjsSite", ["url"]));