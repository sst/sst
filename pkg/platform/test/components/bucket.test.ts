/// <reference path="../../src/global.d.ts" />

import { describe, beforeAll, it, expect } from "vitest";
import * as pulumi from "@pulumi/pulumi";

global.$app = {
  name: "app",
  stage: "test",
};
global.$util = pulumi;

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      return {
        id: args.inputs.name + "_id",
        state: args.inputs,
      };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  },
  "project",
  "stack",
  false // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

describe("Bucket", function () {
  let Bucket: typeof import("./../../src/components/bucket").Bucket;

  beforeAll(async function () {
    Bucket = (await import("./../../src/components/bucket")).Bucket;
  });

  describe("#constructor", () => {
    //it("parent set on children", () => {
    //  new Promise((done) => {
    //    const bucket = new Bucket("MyBucket", { public: true });
    //    //console.log(bucket);
    //    done(true);
    //  });
    //});

    it("bucket name is prefixed", async () => {
      const bucket = new Bucket("MyBucket");
      pulumi.all([bucket.name]).apply(([name]) => {
        expect(name).toMatch(/^app-test-mybucket-\w{8}/);
      });
    });
  });
});
