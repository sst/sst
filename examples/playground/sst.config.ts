/// <reference path="./.sst/src/global.d.ts" />

import * as pulumi from "@pulumi/pulumi";

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    return {
      //...testThrowInApply(),
      ...testProviderOutput(),
      //...testHostedZoneLookup(),
    };
  },
});

function testProviderOutput() {
  const randomprovider: pulumi.dynamic.ResourceProvider = {
    async create(inputs) {
      return { id: "foo", outs: { num: "foo" } };
    },
  };

  class Random extends pulumi.dynamic.Resource {
    public readonly num!: pulumi.Output<string>;

    constructor(name: string, opts?: pulumi.CustomResourceOptions) {
      super(randomprovider, name, { num: undefined }, opts);
    }
  }
  const random = new Random("Random");
  console.log(random);
  return {
    output: random.num,
  };
}

function testHostedZoneLookup() {
  const zone = new sst.HostedZoneLookup("Zone", {
    domain: "a.sst.sh",
  });
  console.log(zone);
  return { zoneId: zone.zoneId, p: "foweih" };
  zone.zoneId.apply((id) => {
    console.log("zoneId", id);
  });
}

function testThrowInApply() {
  // Observations:
  // 1. Has to be related to await aws.route53.getZone because if I replace that
  //    with a component error, the error is caught right away.
  // 2. Only happens when there are 2 components in the chain

  const zoneId = pulumi.output("foo").apply(async (domain) => {
    throw new Error("hi");
  });

  const fn = new aws.lambda.Function(`Function`, {
    role: zoneId,
  });

  new aws.lambda.Function(`Function2`, {
    role: fn.arn,
  });
}
