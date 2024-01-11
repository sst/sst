import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as util from "@pulumi/pulumi";
import * as sst from "../components/";
import { $config } from "../config";

const $secrets = JSON.parse(process.env.SST_SECRETS || "{}");

export {
  aws as "aws",
  cloudflare as "cloudflare",
  util as "util",
  sst as "sst",
  $config as "$config",
  $secrets as "$secrets",
};
