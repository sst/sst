import fs from "fs";
import { Secret } from "./Secret.js";
import { Parameter } from "./Parameter.js";

export function assertNameNotInUse(name: string) {
  if (Secret.hasName(name) || Parameter.hasName(name)) {
    throw new Error(`Config ${name} already exists`);
  }
}

export function codegenTypes() {
  fs.appendFileSync(
    "node_modules/@types/serverless-stack__node/index.d.ts",
    `export * from "./config";`
  );
  fs.writeFileSync(
    "node_modules/@types/serverless-stack__node/config.d.ts",
    `
    import "@serverless-stack/node/config";
    declare module "@serverless-stack/node/config" {
    export interface ConfigType {
      ${[
        "APP",
        "STAGE",
        ...Parameter.getAllNames(),
        ...Secret.getAllNames()
      ].map((p) => `${p}: string;`).join("\n")}
    }
  }`
  );
}

export { Secret, Parameter };
