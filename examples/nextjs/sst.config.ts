/// <reference path="./.sst/types/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      region: "us-east-1",
    };
  },
  async run() {
    const { SSRSite } = await import("./components/NextJSSite");
  },
};
