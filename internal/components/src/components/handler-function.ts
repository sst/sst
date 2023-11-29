import fs from "fs/promises";
import path from "path";
import { Function, FunctionArgs } from "./function";
import { build } from "../runtime/node";
import crypto from "crypto";
import pulumi from "@pulumi/pulumi";

export interface HandlerFunctionArgs
  extends Omit<FunctionArgs, "bundle" | "bundleHash"> {}

export class HandlerFunction extends Function {
  constructor(
    name: string,
    args: HandlerFunctionArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    // TODO - pulumi: what if `build` needs to return 2 values?
    //const handler = build(args);
    //const { out, handler, sourcemap } = build(args);
    const output = pulumi.all([args]).apply(([args]) => build(args));

    super(name, { ...args, bundle: out, bundleHash: calculateHash() }, opts);

    async function calculateHash() {
      const content = await fs.readFile(path.join(out, handler), "utf8");
      const hash = crypto.createHash("sha256");
      hash.update(content);
      return hash.digest("hex");
    }
  }
}
