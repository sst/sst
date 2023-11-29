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
    const result = pulumi.all([args]).apply(async ([args]) => {
      const result = await build(name, args);
      if (result.type === "error") {
        throw new Error(
          [`Failed to build function "${args.handler}"`, ...result.errors].join(
            "\n"
          )
        );
      }

      const content = await fs.readFile(
        path.join(result.out, result.handler),
        "utf8"
      );
      const hash = crypto.createHash("sha256");
      hash.update(content);
      const bundleHash = hash.digest("hex");

      return {
        ...result,
        bundleHash,
      };
    });

    super(
      name,
      { ...args, bundle: result.out, bundleHash: result.bundleHash },
      opts
    );
  }
}
