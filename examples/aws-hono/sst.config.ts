/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hono",
      home: "aws",
    };
  },
  async run() {
    const hono = new sst.aws.Function("Hono", {
      streaming: true,
      handler: "src/index.handler",
      url: true,
    });

    new sst.aws.Nextjs("HonoNextjs", {
      cdn: sst.cloudflare.CdnAdapter, // sst.aws.CdnAdapter
    });

    const router = new sst.aws.Router("HonoRouter", {
      routes: {
        "/*": hono.url,
      },
      domain: {
        domainName: "hono." + domain.domainName,
        dns: sst.cloudflare.DnsAdapter, // sst.aws.DnsAdapter
      },
    });
  },
});
