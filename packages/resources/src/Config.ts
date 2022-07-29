import fs from "fs";
import { Secret } from "./Secret.js";
import { Parameter } from "./Parameter.js";

export function assertNameNotInUse(name: string) {
  if (Secret.hasName(name) || Parameter.hasName(name)) {
    throw new Error(`Config ${name} already exists`);
  }
}

export function codegen() {
  fs.mkdirSync("node_modules/@serverless-stack/node/config", {
    recursive: true,
  });
//    fs.writeFileSync(
//      "node_modules/@types/sst-config/package.json",
//      JSON.stringify({
//        types: "index.d.ts",
//      })
//    );
  fs.writeFileSync(
    "node_modules/@serverless-stack/node/config/config.d.ts",
    `
    import "@serverless-stack/node/config";
    declare module "@serverless-stack/node/config" {
    export interface ConfigType {
      ${[
        ...Parameter.getAllNames(),
        ...Secret.getAllNames()
      ].map((p) => `${p}: string`).join(",\n")}
    }
  }`
  );
}

export { Secret, Parameter };