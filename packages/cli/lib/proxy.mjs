// Enable proxy support via HTTP_PROXY or HTTPS_PROXY
// Precendence is: explicit GLOBAL_AGENT_XX settings (https://www.npmjs.com/package/global-agent#setup-proxy-using-global-agentbootstrap)
// Followed by lower case, then upper case xx_proxy settings (as per https://curl.se/docs/manpage.html)
import { bootstrap} from 'global-agent';

export function proxy_bootstrap() {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.GLOBAL_AGENT_HTTP_PROXY ?? process.env.http_proxy ?? process.env.HTTP_PROXY;
    process.env.GLOBAL_AGENT_HTTPS_PROXY = process.env.GLOBAL_AGENT_HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTPS_PROXY;
    process.env.GLOBAL_AGENT_NO_PROXY = process.env.GLOBAL_AGENT_NO_PROXY ?? process.env.no_proxy ?? process.env.NO_PROXY;
    if (process.env.DEBUG && (process.env.GLOBAL_AGENT_HTTPS_PROXY || process.env.GLOBAL_AGENT_HTTP_PROXY)) {
    console.log(`Using proxy ${process.env.GLOBAL_AGENT_HTTPS_PROXY ?? process.env.GLOBAL_AGENT_HTTP_PROXY}`)  
    bootstrap();
    }
}
