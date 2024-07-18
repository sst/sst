export * as aws from "./aws";
export * as cloudflare from "./cloudflare";
export * as vercel from "./vercel";
export * from "./secret";
export * from "./linkable";

import { Link } from "./link.js";

/**
 * @deprecated
 * Use sst.Linkable.wrap instead.
 */
export const linkable = Link.linkable;
