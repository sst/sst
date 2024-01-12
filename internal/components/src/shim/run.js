import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as util from "@pulumi/pulumi";
import * as sst from "../components/";
import { makeLinkable } from "../components/link";
import { $config } from "../config";

const $secrets = JSON.parse(process.env.SST_SECRETS || "{}");
const { output, apply, all, interpolate } = util;

export {
  makeLinkable as "$linkable",
  output as "$output",
  apply as "$apply",
  all as "$all",
  interpolate as "$interpolate",
  util as "$util",
  aws as "aws",
  cloudflare as "cloudflare",
  sst as "sst",
  $config as "$config",
  $secrets as "$secrets",
};
