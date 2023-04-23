import { createProxy } from "../util/index.js";

export interface StaticSiteResources {}
export interface ReactStaticSiteResources {}
export interface ViteStaticSiteResources {}
export interface NextjsSiteResources {}
export interface RemixSiteResources {}
export interface SolidStartSiteResources {}

export const StaticSite =
  /* @__PURE__ */ createProxy<StaticSiteResources>("StaticSite");
export const ReactStaticSite =
  /* @__PURE__ */
  createProxy<ReactStaticSiteResources>("ReactStaticSite");
export const ViteStaticSite =
  /* @__PURE__ */
  createProxy<ViteStaticSiteResources>("ViteStaticSite");
export const RemixSite =
  /* @__PURE__ */
  createProxy<RemixSiteResources>("RemixSite");
export const NextjsSite =
  /* @__PURE__ */
  createProxy<NextjsSiteResources>("NextjsSite");
export const SolidStartSite =
  /* @__PURE__ */
  createProxy<SolidStartSiteResources>("SolidStartSite");
