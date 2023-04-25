import { Context } from "sst/context";
import { z } from "zod";

export const PublicActor = z.object({
  type: z.literal("public"),
  properties: z.object({}),
});
export type PublicActor = z.infer<typeof PublicActor>;

export const EmailActor = z.object({
  type: z.literal("email"),
  properties: z.object({
    email: z.string().email(),
  }),
});
export type EmailActor = z.infer<typeof EmailActor>;

export const UserActor = z.object({
  type: z.literal("user"),
  properties: z.object({
    userID: z.string().cuid2(),
    workspaceID: z.string().cuid2(),
  }),
});
export type UserActor = z.infer<typeof UserActor>;

export const Actor = z.discriminatedUnion("type", [
  UserActor,
  EmailActor,
  PublicActor,
]);
export type Actor = z.infer<typeof Actor>;

const ActorContext = Context.create<Actor>("actor");

export const useActor = ActorContext.use;
export const provideActor = ActorContext.provide;

export function assertActor<T extends Actor["type"]>(type: T) {
  const actor = useActor();
  if (actor.type !== type) {
    throw new Error(`Expected actor type ${type}, got ${actor.type}`);
  }

  return actor as Extract<Actor, { type: T }>;
}
