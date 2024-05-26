import { Handler } from "aws-lambda";
import { Adapter } from "../auth/adapter/adapter.js";
import { AuthHandler } from "../auth/handler.js";
import { SessionBuilder, createSessionBuilder } from "../auth/session.js";
import { handle, streamHandle } from "hono/aws-lambda";

export module auth {
  export type Issuer = import("openid-client").Issuer;
  export function authorizer<
    Providers extends Record<string, Adapter<any>>,
    Sessions extends SessionBuilder,
  >(...args: Parameters<typeof AuthHandler<Providers, Sessions>>) {
    const hono = AuthHandler(...args);
    return (
      process.env.SST_LIVE ? handle(hono) : streamHandle(hono)
    ) as Handler<any, any>;
  }
  export const sessions = createSessionBuilder;
}
