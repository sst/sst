import type { ProviderArgs as AWS } from "@pulumi/aws";

export interface App {
  name: string;
  removalPolicy?: "remove" | "retain" | "retain-all";
  providers?: {
    aws?: AWS;
  };
}

export interface Config {
  app(input: { stage?: string }): App;
  run(): any;
}

export function $config(input: Config): Config {
  return input;
}
