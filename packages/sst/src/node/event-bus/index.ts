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
import { ZodAny, ZodObject, ZodRawShape, ZodSchema, z } from "zod";
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

export function createEventBuilder<
  Bus extends keyof typeof EventBus,
  MetadataFunction extends () => any,
  Validator extends (schema: any) => (input: any) => any,
  MetadataSchema extends Parameters<Validator>[0] | undefined
>(input: {
  bus: Bus;
  metadata?: MetadataSchema;
  metadataFn?: MetadataFunction;
  validator: Validator;
  client?: EventBridgeClient;
}) {
  const client = input.client || new EventBridgeClient({});
  const validator = input.validator;
  const metadataValidator = input.metadata ? validator(input.metadata) : null;
  return function event<
    Type extends string,
    Schema extends Parameters<Validator>[0]
  >(type: Type, schema: Schema) {
    type Parsed = inferParser<Schema>;
    type Publish = undefined extends MetadataSchema
      ? (properties: Parsed["in"]) => Promise<PutEventsCommandOutput>
      : (
          properties: Parsed["in"],
          // @ts-expect-error
          metadata: inferParser<MetadataSchema>["in"]
        ) => Promise<void>;
    const validate = validator(schema);
    async function publish(properties: any, metadata: any) {
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
        EventBusName: EventBus[input.bus].eventBusName,
        // @ts-expect-error
        Source: Config.APP,
        Detail: JSON.stringify({
          properties: validate(properties),
          metadata: (() => {
            if (metadataValidator) {
              return metadataValidator(metadata);
            }

            if (input.metadataFn) {
              return input.metadataFn();
            }
          })(),
        }),
        DetailType: type,
      });
      return result;
    }
    return {
      publish: publish as Publish,
      type,
      $input: {} as Parsed["in"],
      $output: {} as Parsed["out"],
      $metadata: {} as ReturnType<MetadataFunction>,
    };
  };
}

export function ZodValidator<Schema extends ZodSchema>(
  schema: Schema
): (input: z.input<Schema>) => z.output<Schema> {
  return (input) => {
    return schema.parse(input);
  };
}

// Taken from tRPC
export type ParserZodEsque<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};

export type ParserValibotEsque<TInput, TParsedInput> = {
  _types?: {
    input: TInput;
    output: TParsedInput;
  };
};

export type ParserMyZodEsque<TInput> = {
  parse: (input: any) => TInput;
};

export type ParserSuperstructEsque<TInput> = {
  create: (input: unknown) => TInput;
};

export type ParserCustomValidatorEsque<TInput> = (
  input: unknown
) => Promise<TInput> | TInput;

export type ParserYupEsque<TInput> = {
  validateSync: (input: unknown) => TInput;
};

export type ParserScaleEsque<TInput> = {
  assert(value: unknown): asserts value is TInput;
};

export type ParserWithoutInput<TInput> =
  | ParserCustomValidatorEsque<TInput>
  | ParserMyZodEsque<TInput>
  | ParserScaleEsque<TInput>
  | ParserSuperstructEsque<TInput>
  | ParserYupEsque<TInput>;

export type ParserWithInputOutput<TInput, TParsedInput> =
  | ParserZodEsque<TInput, TParsedInput>
  | ParserValibotEsque<TInput, TParsedInput>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

export type inferParser<TParser extends Parser> =
  TParser extends ParserWithInputOutput<infer $TIn, infer $TOut>
    ? {
        in: $TIn;
        out: $TOut;
      }
    : TParser extends ParserWithoutInput<infer $InOut>
    ? {
        in: $InOut;
        out: $InOut;
      }
    : never;

export type inferEvent<T extends { shape: ZodObject<any> }> = z.infer<
  T["shape"]
>;

type Event = {
  type: string;
  $output: any;
  $metadata: any;
};

type EventPayload<E extends Event> = {
  type: E["type"];
  properties: E["$output"];
  metadata: E["$metadata"];
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
