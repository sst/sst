import * as util from "@pulumi/pulumi";
import * as sst from "../components/";
import { Link } from "../components/link";
import { $config } from "../config";

const $secrets = JSON.parse(process.env.SST_SECRETS || "{}");
const { output, apply, all, interpolate, concat, jsonParse, jsonStringify } =
  util;

const makeLinkable = Link.makeLinkable;
export {
  makeLinkable as "$linkable",
  output as "$output",
  apply as "$apply",
  all as "$resolve",
  interpolate as "$interpolate",
  concat as "$concat",
  jsonParse as "$jsonParse",
  jsonStringify as "$jsonStringify",
  util as "$util",
  sst as "sst",
  $config as "$config",
  $secrets as "$secrets",
};
