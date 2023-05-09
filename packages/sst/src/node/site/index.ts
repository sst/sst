import { createProxy } from "../util/index.js";

export interface StaticSiteResources {}
export interface NextjsSiteResources {}
export interface AstroSiteResources {}
export interface RemixSiteResources {}
export interface SolidStartSiteResources {}
export interface SvelteKitSiteResources {}

export const StaticSite =
  /* @__PURE__ */ createProxy<StaticSiteResources>("StaticSite");
export const AstroSite =
  /* @__PURE__ */
  createProxy<AstroSiteResources>("AstroSite");
export const RemixSite =
  /* @__PURE__ */
  createProxy<RemixSiteResources>("RemixSite");
export const NextjsSite =
  /* @__PURE__ */
  createProxy<NextjsSiteResources>("NextjsSite");
export const SolidStartSite =
  /* @__PURE__ */
  createProxy<SolidStartSiteResources>("SolidStartSite");

export const SvelteKitSite =
  /* @__PURE__ */
  createProxy<SvelteKitSiteResources>("SvelteKitSite");
