export * as aws from "./aws";
export * as cloudflare from "./cloudflare";
export * as vercel from "./vercel";
export * from "./secret";
export * from "./resource";

import { Link as LinkModule } from "./link.js";
export const linkable = LinkModule.makeLinkable;

/** @deprecated Use sst.linkable and sst.aws.linkable instead */
export const Link = LinkModule;
