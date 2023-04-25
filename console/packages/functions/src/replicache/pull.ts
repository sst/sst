import { useActor } from "@console/core/actor";
import { useApiAuth } from "src/api";
import { ApiHandler } from "sst/node/api";
import { useSession } from "sst/node/future/auth";

export const handler = ApiHandler(async () => {
  useApiAuth();

  const actor = useActor();

  if (actor.type === "email") {
  }

  if (actor.type === "user") {
  }

  return {
    statusCode: 401,
  };
});
