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
    stage: string;
    name: string;
    command: string;
    mode: "deploy" | "remove";
    removalPolicy: "remove" | "retain" | "retain-all";
    paths: {
      root: string;
      temp: string;
      home: string;
    };
    aws: {
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_SESSION_TOKEN: string;
      region: aws.Region;
    };
    bootstrap: {
      bucket: string;
    };
  };
}
