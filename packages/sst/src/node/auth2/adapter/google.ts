import { Issuer } from "openid-client";
import { Adapter } from "../index.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

const issuer = await Issuer.discover("https://accounts.google.com");

type GoogleConfig = OidcBasicConfig & { mode: "oidc" };

export function GoogleAdapter(config: GoogleConfig) {
  return OidcAdapter({
    issuer,
    scope: "openid email profile",
    ...config,
  });
}
