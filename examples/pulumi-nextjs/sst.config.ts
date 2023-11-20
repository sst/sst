/// <reference path="./.sst/types/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  async run() {
    await import("./index");
  },
};
