/// <reference path="./.sst/types/index.d.ts" />

export default {
  config() {
    return {
      name: "test",
      profile: "sst-dev",
    };
  },
  async run() {
    const a = new aws.s3.Bucket("my-bucket", {});
  },
};
