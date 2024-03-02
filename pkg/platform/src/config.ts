export interface App {
  name: string;
  removalPolicy?: "remove" | "retain" | "retain-all";
}

export interface Config {
  app(input: { stage?: string }): App;
  run(): any;
  providers?: Record<string, any>;
}

export function $config(input: Config): Config {
  return input;
}
