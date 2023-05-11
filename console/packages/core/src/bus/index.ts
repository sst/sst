export * as Bus from "./index";

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { EventBus } from "sst/node/event-bus";
import { useActor } from "../actor";
import { ZodAny, ZodObject, ZodRawShape, z } from "zod";

const client = new EventBridgeClient({});

export interface Events {}

export type EventName = keyof Events;

export async function publish<Name extends EventName>(
  name: Name,
  properties: Events[Name]
) {
  console.log("publishing event", name, properties);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: EventBus.bus.eventBusName,
          Source: "console",
          Detail: JSON.stringify({
            properties,
            actor: useActor(),
          }),
          DetailType: name,
        },
      ],
    })
  );
}

export function createEvent<
  Type extends string,
  Shape extends ZodRawShape,
  Properties = z.infer<ZodObject<Shape, "strip", ZodAny>>
>(type: Type, properties: Shape) {
  async function publish(properties: Properties) {
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: EventBus.bus.eventBusName,
            Source: "console",
            Detail: JSON.stringify({
              properties,
              actor: useActor(),
            }),
            DetailType: type,
          },
        ],
      })
    );
  }

  return {
    publish,
    type,
    shape: z.object(properties),
  };
}

const event = createEvent("my.event", { foo: z.string() });
type inferEvent<T extends { shape: ZodObject<any> }> = z.infer<T["shape"]>;

type Payload = inferEvent<typeof event>;
