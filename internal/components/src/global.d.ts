import "@types/node";
import "@pulumi/aws";
import "@pulumi/pulumi";
import * as util from "@pulumi/pulumi";
import "@pulumi/cloudflare";
import "./components/index";
import { $config as config, App } from "./config";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

declare global {
  // @ts-expect-error
  export import aws = require("@pulumi/aws");

  // @ts-expect-error
  export import cloudflare = require("@pulumi/cloudflare");

  // @ts-expect-error
  export import $util = require("@pulumi/pulumi");

  // @ts-expect-error
  export import sst = require("./components/index");

  export const $config: typeof config;
  export const $linkable: typeof import("./components/link").makeLinkable;

  export const $output: typeof util.output;
  export const $apply: typeof util.apply;
  export const $all: typeof util.all;
  export const $interpolate: typeof util.interpolate;

  export const $app: Simplify<
    Readonly<
      Omit<App, "providers"> &
        Simplify<{
          stage: string;
          providers: App["providers"];
        }>
    >
  >;
}
