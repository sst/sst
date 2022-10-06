import chalk from "chalk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Enable proxy support with precedence:
// - explicit GLOBAL_AGENT_HTTP(S) settings
// - http(s)_proxy
// - HTTP(S)_PROXY
// https://www.npmjs.com/package/global-agent#setup-proxy-using-global-agentbootstrap
// https://curl.se/docs/manpage.html

export function bootstrap() {
  const GLOBAL_AGENT_HTTP_PROXY = process.env.GLOBAL_AGENT_HTTP_PROXY
    ?? process.env.http_proxy
    ?? process.env.HTTP_PROXY;
  if (GLOBAL_AGENT_HTTP_PROXY !== undefined) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = GLOBAL_AGENT_HTTP_PROXY;
  }

  const GLOBAL_AGENT_HTTPS_PROXY = process.env.GLOBAL_AGENT_HTTPS_PROXY
    ?? process.env.https_proxy
    ?? process.env.HTTPS_PROXY;
  if (GLOBAL_AGENT_HTTPS_PROXY !== undefined) {
    process.env.GLOBAL_AGENT_HTTPS_PROXY = GLOBAL_AGENT_HTTPS_PROXY;
  }

  const GLOBAL_AGENT_NO_PROXY = process.env.GLOBAL_AGENT_NO_PROXY
    ?? process.env.no_proxy
    ?? process.env.NO_PROXY;
  if (GLOBAL_AGENT_NO_PROXY !== undefined) {
    process.env.GLOBAL_AGENT_NO_PROXY = GLOBAL_AGENT_NO_PROXY;
  }

  if (process.env.GLOBAL_AGENT_HTTPS_PROXY || process.env.GLOBAL_AGENT_HTTP_PROXY) {
    console.log(`Using proxy ${process.env.GLOBAL_AGENT_HTTPS_PROXY ?? process.env.GLOBAL_AGENT_HTTP_PROXY}`)

    // Throw error if user app does not have "global-agent"
    try {
      require("global-agent").bootstrap();
    } catch (e: any) {
      if (e.code === "MODULE_NOT_FOUND") {
        console.log(
          chalk.red(
            `\nError: It seems HTTP proxy environment variables are configured. You need to add "global-agent" as a dependency in your package.json. Read more about it here - https://docs.sst.dev/constructs/NextjsSite#nextjs-features\n`
          )
        );
        process.exit(1);
      }
      throw e;
    }
  }
}

export * as Proxy from "./index.js";