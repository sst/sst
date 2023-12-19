import fs from "fs/promises";
import path from "path";
import { Function, FunctionArgs } from "./function.js";
import { build } from "../runtime/node.js";
import crypto from "crypto";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";

export interface HandlerFunctionArgs
  extends Omit<FunctionArgs, "bundle" | "bundleHash"> {}

export class HandlerFunction extends Function {
  constructor(
    name: string,
    args: HandlerFunctionArgs,
    opts?: ComponentResourceOptions,
  ) {
    const buildResult = output(args).apply((args) => build(name, args));
    const successful = buildResult.apply((result) => {
      if (result.type === "error") throw new Error(result.errors.join("\n"));
      return result;
    });
    const hash = successful.apply(async (result) => {
      const content = await fs.readFile(
        path.join(result.out, result.handler),
        "utf8",
      );
      const hash = crypto.createHash("sha256");
      hash.update(content);
      const bundleHash = hash.digest("hex");
      return bundleHash;
    });

    super(
      name,
      {
        ...args,
        handler: successful.handler,
        bundle: successful.out,
        bundleHash: hash,
      },
      opts,
    );
  }
}
