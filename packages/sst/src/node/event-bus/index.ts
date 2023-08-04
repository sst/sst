import { createProxy } from "../util/index.js";

export interface EventBusResources {}

export const EventBus =
  /* @__PURE__ */ createProxy<EventBusResources>("EventBus");

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { EventBridgeEvent } from "aws-lambda";
import { ZodAny, ZodObject, ZodRawShape, z } from "zod";

const client = new EventBridgeClient({});

export function createEventBuilder<
  Bus extends keyof typeof EventBus,
  MetadataShape extends ZodRawShape | undefined,
  MetadataFunction extends () => any
>(props: {
  bus: Bus;
  metadata?: MetadataShape;
  metadataFn?: MetadataFunction;
}) {
  return function createEvent<
    Type extends string,
    Shape extends ZodRawShape,
    Properties = z.infer<ZodObject<Shape, "strip", ZodAny>>
  >(type: Type, properties: Shape) {
    type Publish = undefined extends MetadataShape
      ? (properties: Properties) => Promise<void>
      : (
          properties: Properties,
          metadata: z.infer<
            ZodObject<Exclude<MetadataShape, undefined>, "strip", ZodAny>
          >
        ) => Promise<void>;
    const propertiesSchema = z.object(properties);
    const metadataSchema = props.metadata
      ? z.object(props.metadata)
      : undefined;
    const publish = async (properties: any, metadata: any) => {
      console.log("publishing", type, properties);
      await client.send(
        new PutEventsCommand({
          Entries: [
            {
              // @ts-expect-error
              EventBusName: EventBus[props.bus].eventBusName,
              Source: "console",
              Detail: JSON.stringify({
                properties: propertiesSchema.parse(properties),
                metadata: (() => {
                  if (metadataSchema) {
                    return metadataSchema.parse(metadata);
                  }

                  if (props.metadataFn) {
                    return props.metadataFn();
                  }
                })(),
              }),
              DetailType: type,
            },
          ],
        })
      );
    };

    return {
      publish: publish as Publish,
      type,
      shape: {
        metadata: {} as Parameters<Publish>[1],
        properties: {} as Properties,
        metadataFn: {} as ReturnType<MetadataFunction>,
      },
    };
  };
}

export type inferEvent<T extends { shape: ZodObject<any> }> = z.infer<
  T["shape"]
>;

type Event = {
  type: string;
  shape: {
    properties: any;
    metadata: any;
    metadataFn: any;
  };
};

type EventPayload<E extends Event> = {
  type: E["type"];
  properties: E["shape"]["properties"];
  metadata: undefined extends E["shape"]["metadata"]
    ? E["shape"]["metadataFn"]
    : E["shape"]["metadata"];
  attempts: number;
};

export function EventHandler<Events extends Event>(
  _events: Events | Events[],
  cb: (
    evt: {
      [K in Events["type"]]: EventPayload<Extract<Events, { type: K }>>;
    }[Events["type"]]
  ) => Promise<void>
) {
  return async (
    event: EventBridgeEvent<string, any> & { attempts?: number }
  ) => {
    await cb({
      type: event["detail-type"],
      properties: event.detail.properties,
      metadata: event.detail.metadata,
      attempts: event.attempts ?? 0,
    });
  };
}
