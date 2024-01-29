import type { ProviderArgs as AWS } from "@pulumi/aws";
import type { ProviderArgs as Cloudflare } from "@pulumi/cloudflare";

export interface App {
  name: string;
  removalPolicy?: "remove" | "retain" | "retain-all";
  providers?: {
    aws?: AWS;
    cloudflare?: Cloudflare & {
      accountId?: string;
    };
  };
}

export interface Config {
  app(input: { stage?: string }): App;
  run(): any;
}

export function $config(input: Config): Config {
  return input;
}
