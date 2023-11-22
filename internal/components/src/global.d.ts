import "@types/node";
import "@pulumi/aws";
import "@pulumi/pulumi";
import "./components/index";

declare global {
  // @ts-expect-error
  export import aws = require("@pulumi/aws");

  // @ts-expect-error
  export import util = require("@pulumi/pulumi");

  // @ts-expect-error
  export import sst = require("./components/index");

  export const app: {
    region: string;
    stage: string;
    name: string;
    mode: "deploy" | "remove";
    paths: {
      root: string;
      temp: string;
      home: string;
    };
    aws: {
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_SESSION_TOKEN: string;
    };
    bootstrap: {
      bucket: string;
    };
  };
}
