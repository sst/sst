import { createVerifier } from "fast-jwt";
import { Config } from "../config/index.js";

export const KEY = /* @__PURE__ */ (() => {
  if ("SST_AUTH_TOKEN" in Config)
    /* @ts-expect-error */
    return Config.SST_AUTH_TOKEN;

  throw new Error(
    `The "useSession" hook needs "Config.SST_AUTH_TOKEN" to be set for this function`
  );
})();
export const verifier = createVerifier({ key: KEY });
