import { Config, StackContext } from "sst/constructs";

export function Secrets(ctx: StackContext) {
  return {
    database: Config.Secret.create(
      ctx.stack,
      "PLANETSCALE_HOST",
      "PLANETSCALE_USERNAME",
      "PLANETSCALE_PASSWORD"
    ),
  };
}
