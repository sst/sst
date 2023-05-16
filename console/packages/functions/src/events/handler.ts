import { Actor } from "@console/core/actor";
import { EventBridgeHandler, EventBridgeEvent, SQSEvent } from "aws-lambda";
import { ZodObject, ZodRawShape, z } from "zod";

export function EventHandler<
  Event extends {
    type: string;
    shape: ZodObject<any, any, any>;
  }
>(
  _events: Event,
  cb: (properties: z.infer<Event["shape"]>, actor: Actor) => Promise<void>
) {
  return async (
    event: EventBridgeEvent<
      Event["type"],
      { properties: z.infer<Event["shape"]>; actor: Actor }
    >
  ) => {
    console.log(event);
    await cb(event.detail.properties, event.detail.actor);
  };
}
