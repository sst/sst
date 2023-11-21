/// <reference path="./.sst/types/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      region: "us-east-1",
    };
  },
  async run() {
    const { SsrSite } = await import("./components/SsrSite.ts");
  },
};
