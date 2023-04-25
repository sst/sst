import { useSession } from "sst/node/future/auth";
import { provideActor } from "@console/core/actor";

export function useApiAuth() {
  const session = useSession();
  provideActor(session);
}
