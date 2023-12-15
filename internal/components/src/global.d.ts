import "@types/node";
import "@pulumi/aws";
import "@pulumi/pulumi";
import "./components/index";
import { $config, App } from "./config";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

declare global {
  // @ts-expect-error
  export import aws = require("@pulumi/aws");

  // @ts-expect-error
  export import util = require("@pulumi/pulumi");

  // @ts-expect-error
  export import sst = require("./components/index");

  export { $config } from "./config";

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

