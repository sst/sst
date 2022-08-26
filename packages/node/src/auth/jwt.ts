import { createVerifier } from "fast-jwt";
import { Config } from "../config/index.js";

/* @ts-expect-error */
export const KEY = Config.SST_AUTH_TOKEN;
export const verifier = createVerifier({ key: KEY });
