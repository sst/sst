import "@types/node";
import * as util from "@pulumi/pulumi";
import * as _sst from "./components/index";
import { $config as config, App } from "./config";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

declare global {
  // @ts-expect-error
  export import sst = _sst;

  // @ts-expect-error
  export import $util = util;

  export const $config: typeof config;
  export const $linkable: typeof import("./components/link").Link.makeLinkable;

  export const $output: typeof util.output;
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

  export const $dev: boolean;

  export const $cli: {
    command: string;
    paths: {
      home: string;
      root: string;
      work: string;
      platform: string;
    };
    backend: string;
  };
}
