import { createProxy } from "../util/index.js";

export interface EventBusResources {}

export const EventBus =
  /* @__PURE__ */ createProxy<EventBusResources>("EventBus");

import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
  PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import { EventBridgeEvent } from "aws-lambda";
import { ZodAny, ZodObject, ZodRawShape, z } from "zod";
import { useLoader } from "../util/loader.js";
import { Config } from "../config/index.js";

/**
 * PutEventsCommandOutput is used in return type of createEvent, in case the consumer of SST builds
 * their project with declaration files, this is not portable. In order to allow TS to generate a
 * declaration file without reference to @aws-sdk/client-eventbridge, we must re-export the type.
 *
 * More information here: https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189
 */
export { PutEventsCommandOutput };

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
      ? (properties: Properties) => Promise<PutEventsCommandOutput>
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
      const result = await useLoader(
        "sst.bus.publish",
        async (input: PutEventsRequestEntry[]) => {
          const size = 10;

          const promises: Promise<any>[] = [];
          for (let i = 0; i < input.length; i += size) {
            const chunk = input.slice(i, i + size);
            promises.push(
              client.send(
                new PutEventsCommand({
                  Entries: chunk,
                })
              )
            );
          }
          const settled = await Promise.allSettled(promises);
          const result = new Array<PutEventsCommandOutput>(input.length);
          for (let i = 0; i < result.length; i++) {
            const item = settled[Math.floor(i / 10)];
            if (item.status === "rejected") {
              result[i] = item.reason;
              continue;
            }
            result[i] = item.value;
          }
          return result;
        }
      )({
        // @ts-expect-error
        EventBusName: EventBus[props.bus].eventBusName,
        // @ts-expect-error
        Source: Config.APP,
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
      });
      return result;
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
