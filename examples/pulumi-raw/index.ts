import { randomBytes } from "node:crypto";
import * as pulumi from "@pulumi/pulumi";

const randomprovider: pulumi.dynamic.ResourceProvider = {
  async create(inputs) {
    return { id: randomBytes(16).toString("hex"), outs: {} };
  },
};

class Random extends pulumi.dynamic.Resource {
  constructor(name: string, opts?: pulumi.CustomResourceOptions) {
    super(randomprovider, name, {}, opts);
  }
}

//const bucket = new aws.s3.Bucket("web");
new Random("web");
